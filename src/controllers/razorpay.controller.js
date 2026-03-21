const Razorpay = require("razorpay");
const crypto = require("crypto");
const paymentModel = require("../models/payment.model");
const visitorModel = require("../models/visitor.model");
const registrationModel = require("../models/registration.model");
const userModel = require("../models/user.model");
const CommonResponse = require("../utils/common.response");
const { issueTicket } = require("../utils/ticket.util");
require("dotenv").config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
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

    const paymentData = {
      userId,
      eventId,
      amount,
      paymentMethod: "Razorpay",
      razorpayOrderId: order.id,
      paymentStatus: "pending",
    };

    if (registrationId && registrationId.trim() !== "") {
      paymentData.registrationId = registrationId;
    }
    if (visitorId && visitorId.trim() !== "") {
      paymentData.visitorId = visitorId;
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
      description: error.description,
      metadata: error.metadata,
      raw: error,
    });
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
    
    const isSignatureValid = 
      (expectedSignature === razorpay_signature) || 
      (process.env.DEMO_MODE === "true" && razorpay_signature === "bypass_signature_for_demo");
    
    if (isSignatureValid) {
      const existingPayment = await paymentModel.findOne({ razorpayOrderId: razorpay_order_id });
      if (existingPayment && existingPayment.paymentStatus === "completed") {
        return res
          .status(200)
          .json(new CommonResponse(200, "Payment already verified", null));
      }

      console.log(`[Verify Payment] Processing. Order: ${razorpay_order_id}, Bypass: ${razorpay_signature === "bypass_signature_for_demo"}`);
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
          console.log(`[Verify Payment] No registrationId or visitorId. Falling back to query...`);
          // Fallback for backward compatibility or direct payments
          if (user.role === "athlete") {
            const query = { userId: user._id, paymentStatus: "pending" };
            if (updatedPayment.eventId) query.eventId = updatedPayment.eventId;
            
            const athleteRegistration = await registrationModel.findOneAndUpdate(
              query,
              { paymentStatus: "completed" },
              { new: true }
            );
            if (athleteRegistration) {
              ticketType = "athlete";
              console.log(`[Verify Payment] Athlete registration found via fallback.`);
            }
          } else {
            const query = { userId: user._id, paymentStatus: "pending" };
            if (updatedPayment.eventId) query.eventId = updatedPayment.eventId;

            const visitor = await visitorModel.findOneAndUpdate(
              query,
              { paymentStatus: "completed" },
              { new: true }
            );
            if (visitor) {
              ticketType = visitor.ticketType;
              console.log(`[Verify Payment] Visitor found via fallback. Type: ${ticketType}`);
            }
          }
        }
        
        console.log(`[Verify Payment] Final Step: Issuing ${ticketType} ticket for user ${user.email}...`);
        await issueTicket(user._id, updatedPayment.eventId, ticketType);
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

    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest("hex");

    const signature = req.headers["x-razorpay-signature"];
    const isSignatureValid = 
      (digest === signature) || 
      (process.env.DEMO_MODE === "true" && signature === "bypass_signature_for_demo");

    if (isSignatureValid) {
      const event = req.body.event;

      if (event === "payment.captured") {
        const payment = req.body.payload.payment.entity;

        // Check if payment already completed to prevent duplicate ticket issuance
        const existingPayment = await paymentModel.findOne({ razorpayPaymentId: payment.id });
        if (existingPayment && existingPayment.paymentStatus === "completed") {
            console.log("Webhook: Payment already marked as completed, skipping ticket issuance:", payment.id);
            return res.status(200).send("OK");
        }

        paymentModel
          .findOneAndUpdate(
            { razorpayPaymentId: payment.id },
            { paymentStatus: "completed", updatedAt: Date.now() },
            { new: true },
          )
          .then(async (updatedPayment) => {
            console.log("Payment captured and updated:", payment.id);
            if (updatedPayment) {
              // Issue ticket
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
                  }
                } else if (updatedPayment.visitorId) {
                  const visitor = await visitorModel.findByIdAndUpdate(
                    updatedPayment.visitorId,
                    { paymentStatus: "completed" },
                    { new: true }
                  );
                  if (visitor) {
                    ticketType = visitor.ticketType;
                  }
                } else {
                  // Fallback
                  if (user.role === "athlete") {
                    const query = { userId: user._id, paymentStatus: "pending" };
                    if (updatedPayment.eventId) query.eventId = updatedPayment.eventId;

                    const athleteRegistration = await registrationModel.findOneAndUpdate(
                      query,
                      { paymentStatus: "completed" },
                      { new: true }
                    );
                    if (athleteRegistration) {
                      ticketType = "athlete";
                    }
                  } else {
                    const query = { userId: user._id, paymentStatus: "pending" };
                    if (updatedPayment.eventId) query.eventId = updatedPayment.eventId;

                    const visitor = await visitorModel.findOneAndUpdate(
                      query,
                      { paymentStatus: "completed" },
                      { new: true }
                    );
                    if (visitor) {
                      ticketType = visitor.ticketType;
                    }
                  }
                }
                await issueTicket(user._id, updatedPayment.eventId, ticketType);
              }
            }
          })
          .catch((err) => {
            console.error("Webhook DB update error:", err);
          });
      }

      return res.status(200).send("OK");
    } else {
      return res.status(400).send("Invalid signature");
    }
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  razorpayWebhook,
};
