const https = require('node:https');
require('dotenv').config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

// Replace this with the phone number you want to send the test to
const RECIPIENT_PHONE = "919025257924"; // Example: "919876543210"

if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID || PHONE_NUMBER_ID === "REPLACE_ME") {
  console.error("❌ Error: WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID is missing in .env");
  process.exit(1);
}

const data = JSON.stringify({
  messaging_product: "whatsapp",
  to: RECIPIENT_PHONE,
  type: "template",
  template: {
    name: "hello_world",
    language: {
      code: "en_US"
    }
  }
});

const options = {
  hostname: 'graph.facebook.com',
  path: `/v18.0/${PHONE_NUMBER_ID}/messages`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${WHATSAPP_TOKEN}`
  }
};

console.log(`🚀 Sending test WhatsApp message to ${RECIPIENT_PHONE}...`);

const req = https.request(options, (res) => {
  let chunks = '';

  res.on('data', (chunk) => {
    chunks += chunk;
  });

  res.on('end', () => {
    console.log(`✅ Response Status: ${res.statusCode}`);
    console.log(`📝 Response Body: ${chunks}`);
    
    if (res.statusCode === 200) {
      console.log("\n✨ SUCCESS! Check your phone for the message.");
    } else {
      console.log("\n❌ FAILED! Check the error message in the response body.");
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Request Error: ${e.message}`);
});

req.write(data);
req.end();
