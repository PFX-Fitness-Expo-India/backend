const mongoose = require("mongoose");

const visitorSchema = new mongoose.Schema({
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
    required: true,
    type: String,
    enum: ["gold", "elite", "standard"],
  },
  timeStamp: {
    type: Date,
    default: Date.now,
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed"],
    default: "pending",
  },
  isAttendingEvent: {
    type: String,
    default: "notPresent",
    enum: ["notPresent", "present", "attending"],
  },
});

module.exports = visitorSchema;
