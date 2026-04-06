const mongoose = require("mongoose");
const registrationModel = require("../src/models/registration.model");
const userModel = require("../src/models/user.model");
const eventModel = require("../src/models/event.model");
const { createRegistration } = require("../src/controllers/athlete.controller");
require("dotenv").config();

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Create mock user and event
  const phoneNumber = `test_${Date.now()}`;
  const user = new userModel({ userName: "testuser", email: `test_${Date.now()}@example.com`, password: "password", role: "athlete", phoneNumber });
  const event = new eventModel({ eventName: "Test Event", eventDate: new Date(), eventTime: "10:00 AM", eventDescription: "Desc", eventPrice: 100, eventImage: "img.jpg", dayNumber: 1 });
  
  await user.save();
  await event.save();

  const userId = user._id;
  const eventId = event._id;

  console.log(`User ID: ${userId}, Event ID: ${eventId}`);

  const mockRes = () => {
    const res = {};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.body = data; return res; };
    return res;
  };

  // 1. Create first registration (Subcategory A)
  console.log("Test 1: Creating subcategory A registration...");
  const res1 = mockRes();
  await createRegistration({ body: { userId, eventId, subcategory: "catA", age: 20, gender: "male", weight: 70 } }, res1);
  console.log("Result 1:", res1.statusCode, res1.body.message);

  // 2. Try duplicate (Subcategory A) - expect existing pending
  console.log("Test 2: Attempting duplicate catA registration...");
  const res2 = mockRes();
  await createRegistration({ body: { userId, eventId, subcategory: "catA", age: 20, gender: "male", weight: 70 } }, res2);
  console.log("Result 2:", res2.statusCode, res2.body.message);

  // 3. Create different subcategory (Subcategory B) - expect success
  console.log("Test 3: Creating subcategory B registration...");
  const res3 = mockRes();
  await createRegistration({ body: { userId, eventId, subcategory: "catB", age: 20, gender: "male", weight: 70 } }, res3);
  console.log("Result 3:", res3.statusCode, res3.body.message);

  // 4. Mark Cat A as completed
  console.log("Test 4: Marking catA as completed and testing duplicate...");
  await registrationModel.findOneAndUpdate({ userId, eventId, subcategory: "catA" }, { paymentStatus: "completed" });
  const res4 = mockRes();
  await createRegistration({ body: { userId, eventId, subcategory: "catA", age: 20, gender: "male", weight: 70 } }, res4);
  console.log("Result 4:", res4.statusCode, res4.body.message);

  // Cleanup
  await registrationModel.deleteMany({ userId });
  await userModel.findByIdAndDelete(userId);
  await eventModel.findByIdAndDelete(eventId);
  
  await mongoose.disconnect();
}

test().catch(console.error);
