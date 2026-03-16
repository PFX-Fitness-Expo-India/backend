const mongoose = require("mongoose");

const visitorSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
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
  isAttendingEvent: {
    type: String,
    default: "notPresent",
    enum: ["notPresent", "present", "attending"],
  },
});

module.exports = visitorSchema;
