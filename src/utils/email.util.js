const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const sendEmail = async (options) => {
  const logPath = path.join(process.cwd(), "email_delivery.log");
  
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
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] Attempting to send email to: ${options.email}, Subject: ${options.subject}\n`);
    
    console.log(`[Email Util] Sending email to: ${options.email}, Subject: ${options.subject}`);
    await transporter.sendMail(mailOptions);
    
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] SUCCESS: Email sent to: ${options.email}\n`);
    console.log(`[Email Util] Email sent successfully to: ${options.email}`);
  } catch (error) {
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] FAILED to send email to ${options.email}: ${error.message}\n`);
    console.error(`[Email Util] Failed to send email to ${options.email}:`, error);
    throw error;
  }
};

module.exports = sendEmail;
