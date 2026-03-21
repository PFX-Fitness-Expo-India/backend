const nodemailer = require("nodemailer");
require("dotenv").config();

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `PFX Fitness Expo <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
    attachments: options.attachments || [],
  };

  try {
    console.log(`[Email Util] Sending email to: ${options.email}, Subject: ${options.subject}`);
    await transporter.sendMail(mailOptions);
    console.log(`[Email Util] Email sent successfully to: ${options.email}`);
  } catch (error) {
    console.error(`[Email Util] Failed to send email to ${options.email}:`, error);
    throw error;
  }
};

module.exports = sendEmail;
