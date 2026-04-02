const mongoose = require("mongoose");

const athleteRegistrationSchema = new mongoose.Schema({
  registrationId: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
  },
  age: {
    type: Number,
    required: true,
  },
  gender: {
    type: String,
    required: true,
    enum: ["male", "female"],
  },
  weight: {
    type: Number,
    required: true,
  },
  subcategory: {
    type: String,
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
  paymentMethod: {
    type: String,
    enum: ["online", "offline"],
    default: "online",
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed"],
    default: "pending",
  },
});

module.exports = athleteRegistrationSchema;
