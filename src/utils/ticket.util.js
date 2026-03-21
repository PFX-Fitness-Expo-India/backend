const ticketModel = require("../models/ticket.model");
const Counter = require("../models/counter.model");
const QRCode = require("qrcode");
const sendEmail = require("./email.util");
const userModel = require("../models/user.model");
const eventModel = require("../models/event.model");

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

    // --- Automated Delivery Workflow ---
    try {
      const user = await userModel.findById(userId);
      let event = null;
      if (eventId) {
        event = await eventModel.findById(eventId);
      }
      
      if (user) {
        // 1. Generate QR Code Image (Data URL)
        const qrCodeImage = await QRCode.toDataURL(qrCodeData);

        const eventName = (event && event.eventName) || "PFX Fitness Expo";
        const message = `Hello ${user.userName}, your ticket for ${eventName} has been issued successfully. \nTicket ID: ${ticketId}\nType: ${ticketType}`;

        // 2. Send Email
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
            <h2 style="color: #333; text-align: center;">Ticket Issued Successfully!</h2>
            <p>Hello <strong>${user.userName}</strong>,</p>
            <p>Your ticket for <strong>${eventName}</strong> is ready.</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Ticket ID:</strong> ${ticketId}</p>
              <p><strong>Type:</strong> ${ticketType.toUpperCase()}</p>
              <p><strong>Event:</strong> ${eventName}</p>
            </div>
            <div style="text-align: center; margin-top: 20px;">
              <p>Scan this QR code at the entry:</p>
              <img src="cid:qrcode" alt="Ticket QR Code" style="width: 200px; height: 200px;" />
            </div>
            <p style="font-size: 12px; color: #777; margin-top: 30px; text-align: center;">Team PFX Fitness Expo India</p>
          </div>
        `;

        // 2. Send Email
        try {
          await sendEmail({
            email: user.email,
            subject: `Your Ticket for ${eventName}`,
            message: message,
            html: html,
            attachments: [
              {
                filename: 'ticket-qr.png',
                path: qrCodeImage,
                cid: 'qrcode' // Matches the src="cid:qrcode" in HTML
              }
            ]
          });
          console.log(`Ticket email sent to ${user.email}`);
        } catch (emailError) {
          console.warn(`[Ticket Delivery] Email failed for ${user.email}:`, emailError.message);
        }
      }
    } catch (deliveryError) {
      console.error("Warning: Automated ticket delivery failed but ticket was saved:", deliveryError);
    }

    return ticket;
  } catch (error) {
    console.error("Error issuing ticket:", error);
    throw error;
  }
};

module.exports = {
  issueTicket,
};
