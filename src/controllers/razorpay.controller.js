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
    
    const isSignatureValid = expectedSignature === razorpay_signature;
    
    if (isSignatureValid) {
      const existingPayment = await paymentModel.findOne({ razorpayOrderId: razorpay_order_id });
      if (existingPayment && existingPayment.paymentStatus === "completed") {
        return res
          .status(200)
          .json(new CommonResponse(200, "Payment already verified", null));
      }

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

      if (updatedPayment) {
        const user = await userModel.findById(updatedPayment.userId);
        if (user) {
          let ticketType = "standard";
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
            // Fallback for backward compatibility or direct payments
            if (user.role === "athlete") {
              const athleteRegistration = await registrationModel.findOneAndUpdate(
                { userId: user._id, eventId: updatedPayment.eventId, paymentStatus: "pending" },
                { paymentStatus: "completed" },
                { new: true }
              );
              if (athleteRegistration) {
                ticketType = "athlete";
              }
            } else {
              const visitor = await visitorModel.findOneAndUpdate(
                { userId: user._id, eventId: updatedPayment.eventId, paymentStatus: "pending" },
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

    if (digest === req.headers["x-razorpay-signature"]) {
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
                    const athleteRegistration = await registrationModel.findOneAndUpdate(
                      { userId: user._id, eventId: updatedPayment.eventId, paymentStatus: "pending" },
                      { paymentStatus: "completed" },
                      { new: true }
                    );
                    if (athleteRegistration) {
                      ticketType = "athlete";
                    }
                  } else {
                    const visitor = await visitorModel.findOneAndUpdate(
                      { userId: user._id, eventId: updatedPayment.eventId, paymentStatus: "pending" },
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
