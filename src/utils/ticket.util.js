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
 * @returns {Promise<Object>} - The created ticket object.
 */
const issueTicket = async (userId, eventId, ticketType) => {
  try {
    const year = new Date().getFullYear();
    const ticketId = await generateTicketId(year);

    // Basic string for QR code data, can be changed later to a signed token if needed
    const qrCodeData = JSON.stringify({
      ticketId,
      userId,
      eventId,
      ticketType,
    });

    const ticket = new ticketModel({
      ticketId,
      userId,
      eventId,
      ticketType,
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
