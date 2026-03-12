const schema = require("mongoose");

const atheleteRegistrationSchema = new schema({
  registrationId: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
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
