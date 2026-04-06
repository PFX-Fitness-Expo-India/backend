const mongoose = require("mongoose");
const registrationModel = require("../src/models/registration.model");
const ticketModel = require("../src/models/ticket.model");
const { issueTicket } = require("../src/utils/ticket.util");
require("dotenv").config();

async function fixMissingTickets() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // 1. Find all approved registrations
    const registrations = await registrationModel.find({ status: "approved" });
    console.log(`Checking ${registrations.length} approved registrations...`);

    let fixedCount = 0;
    for (const reg of registrations) {
      // 2. Check if a ticket exists for this specific subcategory
      const existingTicket = await ticketModel.findOne({
        userId: reg.userId,
        eventId: reg.eventId,
        subcategory: reg.subcategory,
        ticketType: "athlete"
      });

      if (!existingTicket) {
        console.log(`Missing ticket for User: ${reg.userId}, Event: ${reg.eventId}, Sub: ${reg.subcategory}. Issuing now...`);
        await issueTicket(reg.userId, reg.eventId, "athlete", reg.subcategory);
        fixedCount++;
      }
    }

    console.log(`✅ Finished! Issued ${fixedCount} missing tickets.`);
  } catch (error) {
    console.error("Error fixing tickets:", error);
  } finally {
    await mongoose.disconnect();
  }
}

fixMissingTickets();
