const mongoose = require("mongoose");
const ticketModel = require("../models/ticket.model");
const Counter = require("../models/counter.model");

/**
 * Generates a unique ticket ID using a counter.
 * Format: PFX-YYYY-XXXX
 */
const generateTicketId = async (year) => {
  const counter = await Counter.findByIdAndUpdate(
    { _id: `ticket_${year}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const sequence = counter.seq.toString().padStart(4, "0");
  return `PFX-${year}-${sequence}`;
};

/**
 * Issues a ticket for a user and event.
 * @param {string} userId - The ID of the user.
 * @param {string} eventId - The ID of the event.
 * @param {string} ticketType - The type of ticket (athlete, gold, elite, standard).
 * @param {string} [subcategory] - The specific subcategory for the athlete.
 * @returns {Promise<Object>} - The created ticket object.
 */
const issueTicket = async (userId, eventId, ticketType, subcategory) => {
  try {
    // Guard: return existing ticket if already issued for this user + event
    if (eventId) {
      const existing = await ticketModel.findOne({ userId, eventId });
      if (existing) {
        console.log(`Ticket already exists for userId ${userId}, eventId ${eventId}. Returning existing: ${existing.ticketId}`);
        return existing;
      }
    }

    const year = new Date().getFullYear();
    const ticketId = await generateTicketId(year);
    const _id = new mongoose.Types.ObjectId();

    // Basic string for QR code data, can be changed later to a signed token if needed
    const qrCodeData = JSON.stringify({
      _id,
      ticketId,
      userId,
      eventId,
      ticketType,
      subcategory,
    });

    const ticket = new ticketModel({
      _id,
      ticketId,
      userId,
      eventId,
      ticketType,
      subcategory,
      qrCodeData,
    });

    await ticket.save();
    console.log(`Ticket issued successfully: ${ticketId}`);

    return ticket;
  } catch (error) {
    console.error("Error issuing ticket:", error);
    throw error;
  }
};

module.exports = {
  issueTicket,
};
