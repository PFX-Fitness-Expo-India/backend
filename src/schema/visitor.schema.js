const Schema = require("mongoose");

const visitorSchema = new Schema({
  visitorId: String,
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
    default: false,
    enum: ["notPresent", "present", "attending"],
  },
});

module.exports = visitorSchema;
