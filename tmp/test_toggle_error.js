const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const eventId = "69ba748c6831c241669210b2";

async function testToggle() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const result = await mongoose.connection.db.collection("events").findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(eventId) },
      { $bit: { isActive: { xor: 1 } } },
      { returnDocument: "after" }
    );

    console.log("Result:", result);
    await mongoose.disconnect();
  } catch (error) {
    console.error("EXPECTED_ERROR:", error.message);
    process.exit(1);
  }
}

testToggle();
