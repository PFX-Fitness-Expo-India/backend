const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  eventId: String,
  eventName: {
    type: String,
    required: true,
  },
  eventDate: {
    type: Date,
    required: true,
  },
  eventTime: {
    type: String,
    required: true,
  },
  eventDescription: {
    type: String,
    required: true,
  },
  eventLocation: {
    type: String,
  },
  eventCapacity: {
    type: Number,
  },
  eventPrice: {
    type: Number,
    required: true,
  },
  eventImage: {
    type: String,
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ["online", "offline"],
  },
});

module.exports = eventSchema;
