const Razorpay = require("razorpay");
const crypto = require("crypto");
const paymentModel = require("../models/payment.model");
const visitorModel = require("../models/visitor.model");
const registrationModel = require("../models/registration.model");
const userModel = require("../models/user.model");
const CommonResponse = require("../utils/common.response");
const { issueTicket } = require("../utils/ticket.util");
require("dotenv").config();

const razorpayKeys = {
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
  webhook_secret: process.env.RAZORPAY_WEBHOOK_SECRET,
};

Object.entries(razorpayKeys).forEach(([key, value]) => {
  if (!value) {
    console.error(`CRITICAL ERROR: ${key.toUpperCase()} is not defined in environment variables.`);
  }
});

const razorpay = new Razorpay({
  key_id: razorpayKeys.key_id,
  key_secret: razorpayKeys.key_secret,
});

const createOrder = async (req, res) => {
  try {
    const { userId, eventId, amount, registrationId, visitorId } = req.body;

    if (!amount) {
      return res
        .status(400)
        .json(new CommonResponse(400, "Amount is required", null));
    }

    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    if (!order) {
      console.error("Order creation failed: Razorpay returned null/undefined");
      return res
        .status(500)
        .json(new CommonResponse(500, "Failed to create order", null));
    }

    console.log(`[Create Order] Incoming: userId=${userId}, eventId=${eventId}, registrationId=${registrationId}, visitorId=${visitorId}, amount=${amount}`);

    const mongoose = require("mongoose");
    const paymentData = {
      userId,
      amount,
      paymentMethod: "Razorpay",
      razorpayOrderId: order.id,
      paymentStatus: "pending",
    };

    if (mongoose.Types.ObjectId.isValid(eventId)) {
      paymentData.eventId = eventId;
    }

    if (registrationId && mongoose.Types.ObjectId.isValid(registrationId.trim())) {
      paymentData.registrationId = registrationId.trim();
    }
    if (visitorId && mongoose.Types.ObjectId.isValid(visitorId.trim())) {
      paymentData.visitorId = visitorId.trim();
    }

    console.log(`[Create Order] Saving payment record with registrationId: ${paymentData.registrationId}, visitorId: ${paymentData.visitorId}`);
    const payment = new paymentModel(paymentData);

    await payment.save();

    return res
      .status(201)
      .json(new CommonResponse(201, "Order created successfully", order));
  } catch (error) {
    console.error("Create order error details:", {
      message: error.message,
      code: error.code,
      name: error.name,
      raw: error,
    });

    if (error.name === "ValidationError") {
      return res.status(400).json(new CommonResponse(400, `Validation Error: ${error.message}`, null));
    }

    if (error.name === "CastError") {
      return res.status(400).json(new CommonResponse(400, `Invalid ID format: ${error.value} is not a valid ${error.kind}`, null));
    }

    const errorMessage =
      error.message ||
      (typeof error === "string" ? error : JSON.stringify(error));
    return res
      .status(500)
      .json(
        new CommonResponse(500, `Internal server error: ${errorMessage}`, null),
      );
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");
    
    const isSignatureValid = expectedSignature === razorpay_signature;
    
    if (isSignatureValid) {
      const existingPayment = await paymentModel.findOne({ razorpayOrderId: razorpay_order_id });
      if (existingPayment && existingPayment.paymentStatus === "completed") {
        return res
          .status(200)
          .json(new CommonResponse(200, "Payment already verified", null));
      }

      console.log(`[Verify Payment] Processing. Order: ${razorpay_order_id}`);
      const updatedPayment = await paymentModel.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        {
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          paymentStatus: "completed",
          updatedAt: Date.now(),
        },
        { new: true },
      );

      if (!updatedPayment) {
        console.error(`[Verify Payment] Payment record not found for orderId: ${razorpay_order_id}`);
        return res.status(404).json(new CommonResponse(404, "Payment record not found", null));
      }

      console.log(`[Verify Payment] Payment updated. User: ${updatedPayment.userId}, RegistrationId: ${updatedPayment.registrationId}, VisitorId: ${updatedPayment.visitorId}`);

      const user = await userModel.findById(updatedPayment.userId);
      if (user) {
        let ticketType = "standard";
        if (updatedPayment.registrationId) {
          console.log(`[Verify Payment] Found registrationId: ${updatedPayment.registrationId}. Updating athlete registration...`);
          const athleteRegistration = await registrationModel.findByIdAndUpdate(
            updatedPayment.registrationId,
            { paymentStatus: "completed" },
            { new: true }
          );
          if (athleteRegistration) {
            console.log(`[Verify Payment] Athlete registration marked completed.`);
            ticketType = "athlete";
          } else {
            console.warn(`[Verify Payment] Registration record ${updatedPayment.registrationId} not found!`);
          }
        } else if (updatedPayment.visitorId) {
          console.log(`[Verify Payment] Found visitorId: ${updatedPayment.visitorId}. Updating visitor status...`);
          const visitor = await visitorModel.findByIdAndUpdate(
            updatedPayment.visitorId,
            { paymentStatus: "completed" },
            { new: true }
          );
          if (visitor) {
            console.log(`[Verify Payment] Visitor status marked completed.`);
            ticketType = visitor.ticketType;
          } else {
            console.warn(`[Verify Payment] Visitor record ${updatedPayment.visitorId} not found!`);
          }
        } else {
          console.log(`[Verify Payment] No registrationId or visitorId. Falling back to sequential model search...`);
          const query = { userId: user._id, paymentStatus: "pending" };
          if (updatedPayment.eventId) query.eventId = updatedPayment.eventId;

          // 1. Try finding an athlete registration first
          let athleteRegistration = await registrationModel.findOneAndUpdate(
            query,
            { paymentStatus: "completed" },
            { new: true }
          );

          if (!athleteRegistration && updatedPayment.eventId) {
            console.log(`[Verify Payment] Athlete not found with eventId. Trying fallback WITHOUT eventId...`);
            athleteRegistration = await registrationModel.findOneAndUpdate(
              { userId: user._id, paymentStatus: "pending" },
              { paymentStatus: "completed" },
              { new: true }
            );
          }

          if (athleteRegistration) {
            ticketType = "athlete";
            console.log(`[Verify Payment] Found athlete registration via fallback.`);
          } else {
            // 2. If no athlete registration, try finding a visitor registration
            let visitor = await visitorModel.findOneAndUpdate(
              query,
              { paymentStatus: "completed" },
              { new: true }
            );

            if (!visitor && updatedPayment.eventId) {
              console.log(`[Verify Payment] Visitor not found with eventId. Trying fallback WITHOUT eventId...`);
              visitor = await visitorModel.findOneAndUpdate(
                { userId: user._id, paymentStatus: "pending" },
                { paymentStatus: "completed" },
                { new: true }
              );
            }

            if (visitor) {
              ticketType = visitor.ticketType;
              console.log(`[Verify Payment] Found visitor via fallback. Type: ${ticketType}`);
            } else {
              console.warn(`[Verify Payment] No pending registration or visitor record found for user ${user.email}! Defaulting to standard ticket.`);
            }
          }
        }
        
        console.log(`[Verify Payment] Final Step: Issuing ${ticketType} ticket for user ${user.email} for event ${updatedPayment.eventId}...`);
        const issuedTicket = await issueTicket(user._id, updatedPayment.eventId, ticketType);
        if (issuedTicket) {
          console.log(`[Verify Payment] Ticket ${issuedTicket.ticketId} issued successfully.`);
        } else {
          console.error(`[Verify Payment] Failed to issue ticket for user ${user.email}!`);
        }
      } else {
        console.error(`[Verify Payment] User record not found for userId: ${updatedPayment.userId}`);
      }

      return res
        .status(200)
        .json(new CommonResponse(200, "Payment verified successfully", null));
    } else {
      return res
        .status(400)
        .json(new CommonResponse(400, "Invalid signature", null));
    }
  } catch (error) {
    console.error("Verify payment error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const razorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error("WEBHOOK ERROR: RAZORPAY_WEBHOOK_SECRET is not defined.");
      return res.status(500).send("Webhook Secret Missing");
    }

    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(req.rawBody || JSON.stringify(req.body));
    const digest = shasum.digest("hex");

    const signature = req.headers["x-razorpay-signature"];
    const isSignatureValid = digest === signature;

    if (!isSignatureValid) {
      console.warn("WEBHOOK WARNING: Invalid signature received.");
      return res.status(400).send("Invalid signature");
    }

    const event = req.body.event;
    console.log(`[Razorpay Webhook] Received event: ${event}`);

    if (event === "payment.captured") {
      const paymentEntity = req.body.payload.payment.entity;
      const razorpayPaymentId = paymentEntity.id;

      // Check if payment already completed to prevent duplicate ticket issuance
      const existingPayment = await paymentModel.findOne({ razorpayPaymentId });
      
      if (existingPayment && existingPayment.paymentStatus === "completed") {
        console.log(`[Razorpay Webhook] Payment ${razorpayPaymentId} already marked as completed, skipping.`);
        return res.status(200).send("OK");
      }

      const updatedPayment = await paymentModel.findOneAndUpdate(
        { razorpayPaymentId },
        { paymentStatus: "completed", updatedAt: Date.now() },
        { new: true }
      );

      if (updatedPayment) {
        console.log(`[Razorpay Webhook] Payment ${razorpayPaymentId} updated to completed.`);
        
        const user = await userModel.findById(updatedPayment.userId);
        if (user) {
          let ticketType = "standard"; // Default fallback
          
          if (updatedPayment.registrationId) {
            const athleteRegistration = await registrationModel.findByIdAndUpdate(
              updatedPayment.registrationId,
              { paymentStatus: "completed" },
              { new: true }
            );
            if (athleteRegistration) {
              ticketType = "athlete";
              console.log(`[Razorpay Webhook] Athlete registration ${updatedPayment.registrationId} marked completed.`);
            }
          } else if (updatedPayment.visitorId) {
            const visitor = await visitorModel.findByIdAndUpdate(
              updatedPayment.visitorId,
              { paymentStatus: "completed" },
              { new: true }
            );
            if (visitor) {
              ticketType = visitor.ticketType;
              console.log(`[Razorpay Webhook] Visitor ${updatedPayment.visitorId} marked completed. Type: ${ticketType}`);
            }
          } else {
            // Fallback logic
            console.log(`[Razorpay Webhook] No registrationId or visitorId. Falling back to sequential model search...`);
            const query = { userId: user._id, paymentStatus: "pending" };
            if (updatedPayment.eventId) query.eventId = updatedPayment.eventId;

            // 1. Try finding an athlete registration first
            let athleteRegistration = await registrationModel.findOneAndUpdate(
              query,
              { paymentStatus: "completed" },
              { new: true }
            );

            if (!athleteRegistration && updatedPayment.eventId) {
              console.log(`[Razorpay Webhook] Athlete not found with eventId. Trying fallback WITHOUT eventId...`);
              athleteRegistration = await registrationModel.findOneAndUpdate(
                { userId: user._id, paymentStatus: "pending" },
                { paymentStatus: "completed" },
                { new: true }
              );
            }

            if (athleteRegistration) {
              ticketType = "athlete";
              console.log(`[Razorpay Webhook] Found athlete registration via fallback.`);
            } else {
              // 2. If no athlete registration, try finding a visitor registration
              let visitor = await visitorModel.findOneAndUpdate(
                query,
                { paymentStatus: "completed" },
                { new: true }
              );

              if (!visitor && updatedPayment.eventId) {
                console.log(`[Razorpay Webhook] Visitor not found with eventId. Trying fallback WITHOUT eventId...`);
                visitor = await visitorModel.findOneAndUpdate(
                  { userId: user._id, paymentStatus: "pending" },
                  { paymentStatus: "completed" },
                  { new: true }
                );
              }

              if (visitor) {
                ticketType = visitor.ticketType;
                console.log(`[Razorpay Webhook] Found visitor via fallback. Type: ${ticketType}`);
              } else {
                console.warn(`[Razorpay Webhook] No pending registration or visitor record found for user ${user.email}! Defaulting to standard ticket.`);
              }
            }
          }
          
          console.log(`[Razorpay Webhook] Issuing ${ticketType} ticket for user ${user.email} for event ${updatedPayment.eventId}...`);
          const issuedTicket = await issueTicket(user._id, updatedPayment.eventId, ticketType);
          if (issuedTicket) {
            console.log(`[Razorpay Webhook] Ticket ${issuedTicket.ticketId} issued successfully.`);
          } else {
            console.error(`[Razorpay Webhook] Failed to issue ticket for user ${user.email}!`);
          }
        } else {
          console.error(`[Razorpay Webhook] User ${updatedPayment.userId} not found for payment ${razorpayPaymentId}`);
        }
      } else {
        console.warn(`[Razorpay Webhook] Payment record not found for Razorpay Payment ID: ${razorpayPaymentId}`);
      }
    }

    // Always return 200 OK for valid signatures to prevent retries
    return res.status(200).send("OK");
  } catch (error) {
    console.error("[Razorpay Webhook] Critical Error:", error);
    // Still return 200 if we want to stop retries, but 500 might be appropriate for internal errors
    // depending on retry policy preference. Industries standard often prefers 200 after logging.
    return res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  razorpayWebhook,
};
