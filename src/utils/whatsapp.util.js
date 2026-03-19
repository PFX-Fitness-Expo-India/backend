const axios = require("axios");

/**
 * Sends a WhatsApp message with the ticket details.
 * Currently uses a placeholder for integration with an automated WhatsApp provider (e.g. Twilio, UltraMsg, etc.).
 * 
 * @param {string} phone - The user's phone number.
 * @param {string} message - The message text.
 * @param {string} imageUrl - The URL or base64 data of the ticket QR code.
 */
const sendWhatsApp = async (phone, message, imageUrl) => {
  try {
    // Formatting phone number to include country code if not present
    const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;

    console.log(`[WhatsApp Simulation] To: ${formattedPhone}`);
    console.log(`[WhatsApp Simulation] Message: ${message}`);
    if (imageUrl) {
        console.log(`[WhatsApp Simulation] Media attached (QR Code generated)`);
    }

    // In a real integration, you would call an API here.
    // Examples:
    // 1. Twilio: 
    // const client = require('twilio')(sid, auth);
    // await client.messages.create({ body: message, mediaUrl: imageUrl, from: 'whatsapp:+14155238886', to: `whatsapp:${formattedPhone}` });
    
    // 2. UltraMsg/similar:
    // await axios.post("https://api.ultramsg.com/...", { token: "...", to: formattedPhone, body: message, image: imageUrl });

    return true;
  } catch (error) {
    console.error("WhatsApp delivery failed:", error);
    return false;
  }
};

module.exports = sendWhatsApp;
