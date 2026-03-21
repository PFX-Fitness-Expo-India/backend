const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
  },
  ticketType: {
    type: String,
    required: true,
    enum: ["athlete", "gold", "elite", "standard"],
  },
  status: {
    type: String,
    default: "unused",
    enum: ["unused", "used", "cancelled"],
  },
  qrCodeData: {
    type: String,
    required: true,
  },
  issuedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = ticketSchema;
