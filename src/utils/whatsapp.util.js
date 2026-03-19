const { sendMessage } = require("./baileys.util");

/**
 * Sends a WhatsApp message using Baileys.
 * 
 * @param {string} phone - The user's phone number.
 * @param {string} message - The message text.
 * @param {string} imageUrl - The URL or path of the ticket QR code.
 */
const sendWhatsApp = async (phone, message, imageUrl) => {
  try {
    // Basic phone formatting for Baileys (strip '+' and add '91' if 10 digits)
    let formattedPhone = phone;
    if (phone.startsWith("+")) {
      formattedPhone = phone.substring(1);
    } else if (phone.length === 10) {
      formattedPhone = `91${phone}`;
    }

    const success = await sendMessage(formattedPhone, message, imageUrl);
    
    if (success) {
      console.log(`[WhatsApp] Message sent successfully via Baileys to ${phone}`);
      return true;
    } else {
      console.warn("[WhatsApp] Baileys delivery failed. Ensure WhatsApp is linked.");
      return false;
    }
  } catch (error) {
    console.error("[WhatsApp] Error sending message via Baileys:", error.message);
    return false;
  }
};

module.exports = sendWhatsApp;
