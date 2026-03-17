const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  paymentId: String,
  userId: {
    ref: "User",
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  eventId: {
    ref: "Event",
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  amount: Number,
  paymentStatus: String,
  paymentDate: Date,
  paymentMethod: String,
  transactionId: String,
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = paymentSchema;
