const mongoose = require("mongoose");
require("dotenv").config();

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// MOCKING
const emailUtilPath = require.resolve("../src/utils/email.util");
require(emailUtilPath);
require.cache[emailUtilPath].exports = async () => { 
  console.log("   [MOCK] Email sent successfully"); 
  return { response: "ok" }; 
};

const userModel = require("../src/models/user.model");
const registrationModel = require("../src/models/registration.model");
const eventModel = require("../src/models/event.model");
const { signup, updateProfile } = require("../src/controllers/auth.controller");
const { createRegistration } = require("../src/controllers/athlete.controller");

async function test() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const mockRes = () => {
      const res = {};
      res.status = (code) => { res.statusCode = code; return res; };
      res.json = (data) => { res.body = data; return res; };
      return res;
    };

    const email = `athlete_${Date.now()}@test.com`.toLowerCase();
    const phoneNumber = `${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    console.log(`Using email: ${email} and phone: ${phoneNumber}`);

    // 1. Signup with bio-data
    console.log("\nTest 1: Signup with bio-data...");
    const res1 = mockRes();
    await signup({
      body: {
        userName: "Athlete User",
        email,
        phoneNumber,
        password: "password123",
        role: "athlete",
        gender: "male",
        age: 25,
        weight: 80,
        height: 180
      }
    }, res1);
    console.log("Signup Result:", res1.statusCode, JSON.stringify(res1.body));

    const user = await userModel.findOne({ email });
    if (!user) throw new Error("User NOT found after signup");
    console.log("User Bio-Data in DB:", { gender: user.gender, age: user.age, weight: user.weight, height: user.height });

    // 2. Create Event
    const event = new eventModel({
      eventName: "Bio-Data Test Event",
      eventDate: new Date(),
      eventTime: "12:00 PM",
      eventDescription: "Test",
      eventPrice: 50,
      eventImage: "test.jpg",
      dayNumber: 1
    });
    await event.save();
    console.log("\nEvent created:", event._id);

    // 3. Register for event WITHOUT bio-data in request
    console.log("Test 2: Registering for event (no bio-data in request)...");
    const res2 = mockRes();
    await createRegistration({
      body: {
        userId: user._id,
        eventId: event._id,
        subcategory: "cat_old",
        paymentMethod: "online"
      }
    }, res2);
    console.log("Registration Status:", res2.statusCode, JSON.stringify(res2.body));
    
    const registration = await registrationModel.findOne({ userId: user._id, subcategory: "cat_old" });
    if (!registration) throw new Error("Registration NOT found");
    console.log("Registration Snapshotted Bio-Data:", {
      age: registration.age,
      gender: registration.gender,
      weight: registration.weight,
      height: registration.height
    });

    // 4. Update Profile
    console.log("\nTest 3: Updating profile bio-data...");
    const res3 = mockRes();
    await updateProfile({
      user: { userId: user._id },
      body: { weight: 85, height: 182 }
    }, res3);
    console.log("Update Profile Result:", res3.statusCode, JSON.stringify(res3.body));

    // 5. Register for another subcategory
    console.log("Test 4: Registering for another subcategory after profile update...");
    const res4 = mockRes();
    await createRegistration({
      body: {
        userId: user._id,
        eventId: event._id,
        subcategory: "cat_new",
        paymentMethod: "online"
      }
    }, res4);
    
    const registrationNew = await registrationModel.findOne({ userId: user._id, subcategory: "cat_new" });
    if (!registrationNew) throw new Error("New registration NOT found");
    console.log("New Registration Snapshotted Bio-Data (Updated):", {
      age: registrationNew.age,
      gender: registrationNew.gender,
      weight: registrationNew.weight,
      height: registrationNew.height
    });

    // Cleanup
    console.log("\nCleaning up...");
    await registrationModel.deleteMany({ userId: user._id });
    await userModel.findByIdAndDelete(user._id);
    await eventModel.findByIdAndDelete(event._id);

    console.log("Done.");
  } catch (err) {
    console.error("FATAL ERROR IN TEST:", err);
  } finally {
    await mongoose.disconnect();
  }
}

test();
