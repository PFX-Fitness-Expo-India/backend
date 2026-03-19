const twilio = require("twilio");

/**
 * Sends a real WhatsApp message using Twilio API.
 * 
 * @param {string} phone - The user's phone number.
 * @param {string} message - The message text.
 * @param {string} imageUrl - The URL of the ticket QR code (Twilio requires a public URL for media).
 */
const sendWhatsApp = async (phone, message, imageUrl) => {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromWhatsApp = process.env.TWILIO_WHATSAPP_FROM; // e.g., 'whatsapp:+14155238886'

    if (!accountSid || !authToken || !fromWhatsApp) {
      console.warn("[WhatsApp] Twilio credentials not configured. Falling back to simulation.");
      console.log(`[WhatsApp Simulation] To: ${phone}, Message: ${message}`);
      return false;
    }

    const client = twilio(accountSid, authToken);
    const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;

    const msgOptions = {
      body: message,
      from: fromWhatsApp,
      to: `whatsapp:${formattedPhone}`,
    };

    // Note: Twilio mediaUrl must be a publicly accessible URL.
    // Base64 Data URLs are NOT supported by Twilio.
    // If using base64, you'll need to upload to S3/Cloudinary first.
    if (imageUrl && imageUrl.startsWith("http")) {
      msgOptions.mediaUrl = [imageUrl];
    }

    const response = await client.messages.create(msgOptions);
    console.log(`[WhatsApp] Message sent successfully via Twilio: ${response.sid}`);
    return true;
  } catch (error) {
    console.error("[WhatsApp] Twilio delivery failed:", error.message);
    return false;
  }
};

module.exports = sendWhatsApp;
