const Razorpay = require("razorpay");
const crypto = require("crypto");
const paymentModel = require("../models/payment.model");
const CommonResponse = require("../utils/common.response");
require("dotenv").config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createOrder = async (req, res) => {
  try {
    const { userId, eventId, amount } = req.body;

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
      return res
        .status(500)
        .json(new CommonResponse(500, "Failed to create order", null));
    }

    // Save initial payment record
    const payment = new paymentModel({
      userId,
      eventId,
      amount,
      paymentMethod: "Razorpay",
      razorpayOrderId: order.id,
      paymentStatus: "pending",
    });

    await payment.save();

    return res
      .status(201)
      .json(new CommonResponse(201, "Order created successfully", order));
  } catch (error) {
    console.error("Create order error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isSignatureValid = expectedSignature === razorpay_signature;

    if (isSignatureValid) {
      await paymentModel.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        {
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          paymentStatus: "completed",
          updatedAt: Date.now(),
        }
      );

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

module.exports = {
  createOrder,
  verifyPayment,
};
