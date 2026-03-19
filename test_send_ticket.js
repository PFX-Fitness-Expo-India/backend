const mongoose = require("mongoose");
require("dotenv").config();
const { issueTicket } = require("./src/utils/ticket.util");
const User = require("./src/models/user.model");
const Event = require("./src/models/event.model");

async function testSendTicket() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/pfx-fitness";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB for delivery test.");

    // --- USER: UPDATE THESE VALUES TO TEST WITH YOUR REAL ACCOUNT ---
    const TEST_EMAIL = "siranjeevi.pro@gmail.com"; 
    const TEST_PHONE = "6385908383"; 
    const TEST_USER_NAME = "PFX Tester";
    // -------------------------------------------------------------

    console.log(`Setting up test user with Email: ${TEST_EMAIL} and Phone: ${TEST_PHONE}`);

    let user = await User.findOne({ email: TEST_EMAIL });
    if (!user) {
        user = new User({
            userName: TEST_USER_NAME, 
            email: TEST_EMAIL,
            phoneNumber: TEST_PHONE, 
            role: "visitor", 
            password: "testpassword123" 
        });
        await user.save();
        console.log(`New test user created: ${user._id}`);
    } else {
        console.log(`Using existing test user: ${user._id}`);
    }

    let event = await Event.findOne({ eventName: "PFX Championship Expo" });
    if (!event) {
        event = new Event({
            eventName: "PFX Championship Expo",
            eventDate: new Date(), 
            eventTime: "10:00 AM",
            eventDescription: "Main Event for PFX Fitness Expo",
            eventPrice: 1000,
            eventImage: "event.jpg",
            isActive: true
        });
        await event.save();
        console.log(`New event created for test: ${event._id}`);
    } else {
        console.log(`Using existing event: ${event._id}`);
    }

    // 2. Issue ticket (this triggers Email and WhatsApp delivery)
    console.log("\n--- Triggering issueTicket ---");
    const ticket = await issueTicket(user._id, event._id, "gold");
    
    console.log("\n--- Test Finished ---");
    console.log(`Ticket ID generated: ${ticket.ticketId}`);
    console.log("Check the console logs for delivery status.");
    console.log("\nIMPORTANT:");
    console.log("1. Update EMAIL_USER and EMAIL_PASS in .env for real emails.");
    console.log("2. WhatsApp is currently a simulation (check logs).");

  } catch (error) {
    console.error("Test execution failed:", error);
    if (error.code === 11000) {
        console.error("TIP: Use a different phone number/email in the script if they already exist.");
    }
  } finally {
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
  }
}

testSendTicket();
