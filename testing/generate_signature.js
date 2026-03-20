const crypto = require("crypto");
require("dotenv").config();

/**
 * Utility to generate a Razorpay signature for Postman testing.
 * 
 * Usage: 
 * 1. Update ORDER_ID and PAYMENT_ID below.
 * 2. Run: node testing/generate_signature.js
 */

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "1rEAA7GXpv4UvpDbunUny0oP";

const ORDER_ID = "order_STa0I0X8wTydd0"; // Replace with your actual Order ID from Step 2
const PAYMENT_ID = "pay_P1l5S2j9K8z1Lp";   // Any dummy Payment ID

const body = ORDER_ID + "|" + PAYMENT_ID;

const signature = crypto
  .createHmac("sha256", RAZORPAY_KEY_SECRET)
  .update(body.toString())
  .digest("hex");

console.log("------------------------------------------");
console.log("RAZORPAY TESTING SIGNATURE");
console.log("------------------------------------------");
console.log(`Order ID:      ${ORDER_ID}`);
console.log(`Payment ID:    ${PAYMENT_ID}`);
console.log(`Signature:     ${signature}`);
console.log("------------------------------------------");
console.log("Use these values in your Postman 'verify-payment' request body.");
