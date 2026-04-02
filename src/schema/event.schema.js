const mongoose = require("mongoose");
const Counter = require("../models/counter.model");

const eventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    unique: true,
  },
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
  eventRules: {
    type: [String],
  },
  paymentMethod: {
    type: String,
    enum: ["online", "offline"],
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  haveSubcategory: {
    type: Boolean,
    enum: [true, false],
    default: false,
  },
  subcategories: [
    {
      name: String,
    },
  ],
});

eventSchema.pre("save", async function () {
  if (this.isNew) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        "event",
        { $inc: { seq: 1 } },
        { new: true, upsert: true },
      );
      this.eventId = `pfx-event-${counter.seq}`;
    } catch (error) {
      throw error;
    }
  }
});

module.exports = eventSchema;
