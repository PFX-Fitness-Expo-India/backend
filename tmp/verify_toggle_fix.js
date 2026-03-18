const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const eventId = "69ba748c6831c241669210b2";
const eventModel = require("../src/models/event.model");

async function testToggleFix() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const event = await eventModel.findById(eventId);
    if (!event) throw new Error("Event not found");

    const oldStatus = event.isActive;
    event.isActive = !event.isActive;
    await event.save();

    console.log("Toggle Successful!");
    console.log("Old Status:", oldStatus);
    console.log("New Status:", event.isActive);
    console.log("Type of New Status:", typeof event.isActive);

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

testToggleFix();
