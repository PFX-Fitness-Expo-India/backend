const schema = require("mongoose");

const atheleteRegistrationSchema = new schema({
  userId: {
    type: String,
    required: true,
  },
  eventId: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  bookingType: {
    type: String,
    required: true,
    enum: ["online", "offline"],
  },
  paymentType: {
    type: String,
    required: true,
    enum: ["success", "pending", "failed"],
  },
  timeStamp: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    required: true,
    enum: ["pending", "approved", "rejected"],
  },
});

module.exports = atheleteRegistrationSchema;
