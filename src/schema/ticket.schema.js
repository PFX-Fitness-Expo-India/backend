const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
  },
  ticketType: {
    type: String,
    required: true,
    enum: ["athlete", "gold", "elite", "standard"],
  },
  status: {
    type: String,
    default: "unused",
    enum: ["unused", "used", "cancelled"],
  },
  qrCodeData: {
    type: String,
    required: true,
  },
  issuedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  subcategory: {
    type: String,
  },
  statusUpdatedAt: {
    type: Date,
  },
});

ticketSchema.post("save", async function (doc) {
  try {
    const deliverTicket = async () => {
      try {
        const mongoose = require("mongoose");
        const User = mongoose.model("User");
        const Event = mongoose.model("Event");
        const QRCode = require("qrcode");
        const sendEmail = require("../utils/email.util");

        const user = await User.findById(doc.userId);
        if (!user) {
          console.error(`[Ticket Hook] User not found: ${doc.userId}`);
          return;
        }

        let event = null;
        if (doc.eventId) {
          event = await Event.findById(doc.eventId);
        }

        const qrCodeImage = await QRCode.toDataURL(doc.qrCodeData);
        const eventName = (event && event.eventName) || "PFX Fitness Expo";
        const typeLabel = (doc.ticketType || "standard").toUpperCase();
        const subcategoryText = doc.subcategory ? `\nSubcategory: ${doc.subcategory}` : "";

        const message = `Hello ${user.userName || "User"}, your ticket for ${eventName} has been issued successfully. \nTicket ID: ${doc.ticketId}\nType: ${typeLabel}${subcategoryText}`;

        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
            <h2 style="color: #333; text-align: center;">Ticket Issued Successfully!</h2>
            <p>Hello <strong>${user.userName || "User"}</strong>,</p>
            <p>Your ticket for <strong>${eventName}</strong> is ready.</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Ticket ID:</strong> ${doc.ticketId}</p>
              <p><strong>Type:</strong> ${typeLabel}</p>
              ${doc.subcategory ? `<p><strong>Category:</strong> ${doc.subcategory}</p>` : ""}
              <p><strong>Event:</strong> ${eventName}</p>
            </div>
            <div style="text-align: center; margin-top: 20px;">
              <p>Scan this QR code at the entry:</p>
              <img src="cid:qrcode" alt="Ticket QR Code" style="width: 200px; height: 200px;" />
            </div>
            <p style="font-size: 12px; color: #777; margin-top: 30px; text-align: center;">Team PFX Fitness Expo India</p>
          </div>
        `;

        await sendEmail({
          email: user.email,
          subject: `Your Ticket for ${eventName}`,
          message: message,
          html: html,
          attachments: [
            {
              filename: "ticket-qr.png",
              path: qrCodeImage,
              cid: "qrcode",
            },
          ],
        });
        console.log(
          `[Ticket Hook] Success: Ticket email sent to ${user.email}`,
        );
      } catch (deliveryError) {
        console.error("[Ticket Hook] Delivery Error:", deliveryError);
      }
    };

    // Run in background
    deliverTicket();
  } catch (error) {
    console.error("[Ticket Hook] Hook Error:", error);
  }
});

module.exports = ticketSchema;
