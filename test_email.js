const sendEmail = require("./src/utils/email.util");
require("dotenv").config();

async function testEmail() {
  try {
    console.log("Attempting to send test email to: " + process.env.EMAIL_USER);
    const qrCodeImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    await sendEmail({
      email: process.env.EMAIL_USER,
      subject: "PFX Test Email with Attachment",
      message: "This is a test email with a base64 attachment.",
      html: "<h1>Test Email</h1><p>Check the attachment.</p><img src=\"cid:qrcode\" />",
      attachments: [
        {
          filename: 'ticket-qr.png',
          path: qrCodeImage,
          cid: 'qrcode'
        }
      ]
    });
    console.log("Test email with attachment sent successfully!");
  } catch (error) {
    console.error("Test email failed:", error);
  }
}

testEmail();
