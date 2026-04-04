const Razorpay = require("razorpay");
const crypto = require("crypto");
const paymentModel = require("../models/payment.model");
const visitorModel = require("../models/visitor.model");
const registrationModel = require("../models/registration.model");
const ticketModel = require("../models/ticket.model");
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

/**
 * Shared helper: resolves ticket type from an already-updated payment record,
 * then issues the ticket if one doesn't already exist.
 * Mirrors the exact same logic used for visitors — direct ID-based lookup only.
 */
const resolveAndIssueTicket = async (payment, tag = "Payment") => {
  const user = await userModel.findById(payment.userId);
  if (!user) {
    console.error(`[${tag}] User not found for userId: ${payment.userId}`);
    return;
  }

  // Guard: never issue a duplicate ticket for the same user + event
  const existingTicket = await ticketModel.findOne({
    userId: payment.userId,
    eventId: payment.eventId,
  });
  if (existingTicket) {
    console.log(`[${tag}] Ticket already exists for user ${user.email} (event: ${payment.eventId}). Skipping.`);
    return;
  }

  let ticketType = "standard";
  let subcategory = null;
  let eventId = payment.eventId;

  if (payment.registrationId) {
    // --- ATHLETE path (mirrors visitor path exactly) ---
    console.log(`[${tag}] registrationId found: ${payment.registrationId}. Resolving athlete registration...`);
    const registration = await registrationModel.findByIdAndUpdate(
      payment.registrationId,
      { paymentStatus: "completed", status: "approved" },
      { new: true }
    );
    if (!registration) {
      console.warn(`[${tag}] Registration ${payment.registrationId} not found. Cannot issue ticket.`);
      return;
    }
    ticketType = "athlete";
    subcategory = registration.subcategory;
    // Use eventId from the registration if it wasn't on the payment record
    if (!eventId && registration.eventId) {
      eventId = registration.eventId;
    }
    console.log(`[${tag}] Athlete registration resolved. subcategory: ${subcategory || "none"}`);

  } else if (payment.visitorId) {
    // --- VISITOR path ---
    console.log(`[${tag}] visitorId found: ${payment.visitorId}. Resolving visitor...`);
    const visitor = await visitorModel.findByIdAndUpdate(
      payment.visitorId,
      { paymentStatus: "completed" },
      { new: true }
    );
    if (!visitor) {
      console.warn(`[${tag}] Visitor ${payment.visitorId} not found. Cannot issue ticket.`);
      return;
    }
    ticketType = visitor.ticketType;
    // Use eventId from the visitor record if not on payment
    if (!eventId && visitor.eventId) {
      eventId = visitor.eventId;
    }
    console.log(`[${tag}] Visitor resolved. ticketType: ${ticketType}`);

  } else {
    console.warn(`[${tag}] No registrationId or visitorId linked to payment ${payment._id}. Cannot issue ticket.`);
    return;
  }

  console.log(`[${tag}] Issuing ${ticketType} ticket for user ${user.email} (event: ${eventId}, subcategory: ${subcategory || "none"})...`);
  const issuedTicket = await issueTicket(user._id, eventId, ticketType, subcategory);
  if (issuedTicket) {
    console.log(`[${tag}] Ticket ${issuedTicket.ticketId} issued successfully.`);
  } else {
    console.error(`[${tag}] issueTicket returned falsy for user ${user.email}.`);
  }
};

// ─────────────────────────────────────────────
// createOrder
// ─────────────────────────────────────────────
const createOrder = async (req, res) => {
  try {
    const { userId, eventId, amount, registrationId, visitorId } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json(new CommonResponse(400, "User ID is required for payment", null));
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return res
        .status(400)
        .json(new CommonResponse(400, "Valid amount is required", null));
    }

    const options = {
      amount: Math.round(Number(amount) * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}_${userId.slice(-4)}`,
    };

    const order = await razorpay.orders.create(options);

    if (!order) {
      console.error("Order creation failed: Razorpay returned null/undefined");
      return res
        .status(500)
        .json(new CommonResponse(500, "Failed to create order", null));
    }

    console.log(`[Create Order] userId=${userId}, eventId=${eventId}, registrationId=${registrationId}, visitorId=${visitorId}, amount=${amount}`);

    const mongoose = require("mongoose");
    const paymentData = {
      userId,
      amount,
      paymentMethod: "Razorpay",
      razorpayOrderId: order.id,
      paymentStatus: "pending",
    };

    if (mongoose.Types.ObjectId.isValid(eventId)) paymentData.eventId = eventId;
    if (registrationId && mongoose.Types.ObjectId.isValid(registrationId.trim())) paymentData.registrationId = registrationId.trim();
    if (visitorId && mongoose.Types.ObjectId.isValid(visitorId.trim())) paymentData.visitorId = visitorId.trim();

    console.log(`[Create Order] Saving payment with registrationId: ${paymentData.registrationId}, visitorId: ${paymentData.visitorId}`);
    const payment = new paymentModel(paymentData);
    await payment.save();

    return res
      .status(201)
      .json(new CommonResponse(201, "Order created successfully", order));
  } catch (error) {
    console.error("Create order error:", {
      message: error.message,
      code: error.code,
      name: error.name,
    });

    if (error.name === "ValidationError") {
      return res.status(400).json(new CommonResponse(400, `Validation Error: ${error.message}`, null));
    }
    if (error.name === "CastError") {
      return res.status(400).json(new CommonResponse(400, `Invalid ID format: ${error.value} is not a valid ${error.kind}`, null));
    }

    const errorMessage = error.message || (typeof error === "string" ? error : JSON.stringify(error));
    return res.status(500).json(new CommonResponse(500, `Internal server error: ${errorMessage}`, null));
  }
};

// ─────────────────────────────────────────────
// verifyPayment  (called by the frontend)
// ─────────────────────────────────────────────
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isSignatureValid = expectedSignature === razorpay_signature;

    if (!isSignatureValid) {
      return res.status(400).json(new CommonResponse(400, "Invalid signature", null));
    }

    console.log(`[Verify Payment] Signature valid for order: ${razorpay_order_id}`);

    // Check if this order was already processed (webhook may have fired first)
    const existingPayment = await paymentModel.findOne({ razorpayOrderId: razorpay_order_id });

    if (existingPayment && existingPayment.paymentStatus === "completed") {
      console.log(`[Verify Payment] Payment already completed. Ensuring ticket exists...`);
      // Ticket might be missing if the webhook didn't fire — resolve it now
      await resolveAndIssueTicket(existingPayment, "Verify Payment (already completed)");
      return res.status(200).json(new CommonResponse(200, "Payment verified successfully", null));
    }

    // Mark payment as completed
    const updatedPayment = await paymentModel.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paymentStatus: "completed",
        updatedAt: Date.now(),
      },
      { new: true }
    );

    if (!updatedPayment) {
      console.error(`[Verify Payment] Payment record not found for orderId: ${razorpay_order_id}`);
      return res.status(404).json(new CommonResponse(404, "Payment record not found", null));
    }

    console.log(`[Verify Payment] Payment marked completed. registrationId: ${updatedPayment.registrationId}, visitorId: ${updatedPayment.visitorId}`);

    // Issue ticket using the same logic as visitor flow
    await resolveAndIssueTicket(updatedPayment, "Verify Payment");

    return res.status(200).json(new CommonResponse(200, "Payment verified successfully", null));
  } catch (error) {
    console.error("Verify payment error:", error);
    return res.status(500).json(new CommonResponse(500, "Internal server error", null));
  }
};

// ─────────────────────────────────────────────
// razorpayWebhook  (called by Razorpay servers)
// ─────────────────────────────────────────────
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
    if (digest !== signature) {
      console.warn("WEBHOOK WARNING: Invalid signature received.");
      return res.status(400).send("Invalid signature");
    }

    const event = req.body.event;
    console.log(`[Razorpay Webhook] Received event: ${event}`);

    if (event === "payment.captured") {
      const paymentEntity = req.body.payload.payment.entity;
      const razorpayPaymentId = paymentEntity.id;
      const razorpayOrderId = paymentEntity.order_id;

      // Skip if already processed
      const existingPayment = await paymentModel.findOne({ razorpayOrderId });
      if (existingPayment && existingPayment.paymentStatus === "completed") {
        console.log(`[Razorpay Webhook] Order ${razorpayOrderId} already completed. Ensuring ticket exists...`);
        await resolveAndIssueTicket(existingPayment, "Webhook (already completed)");
        return res.status(200).send("OK");
      }

      // Mark payment as completed
      const updatedPayment = await paymentModel.findOneAndUpdate(
        { razorpayOrderId },
        { razorpayPaymentId, paymentStatus: "completed", updatedAt: Date.now() },
        { new: true }
      );

      if (!updatedPayment) {
        console.warn(`[Razorpay Webhook] Payment record not found for order: ${razorpayOrderId}`);
        return res.status(200).send("OK");
      }

      console.log(`[Razorpay Webhook] Payment ${razorpayPaymentId} marked completed. registrationId: ${updatedPayment.registrationId}, visitorId: ${updatedPayment.visitorId}`);

      // Issue ticket using the same logic as visitor flow
      await resolveAndIssueTicket(updatedPayment, "Webhook");
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.error("[Razorpay Webhook] Critical Error:", error);
    return res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  razorpayWebhook,
};
