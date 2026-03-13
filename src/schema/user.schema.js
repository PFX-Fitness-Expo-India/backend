const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userId: String,
  userName: {
    required: true,
    type: String,
  },
  phoneNumber: {
    required: true,
    type: String,
    unique: true,
  },
  email: {
    required: true,
    type: String,
    unique: true,
  },
  password: {
    required: true,
    type: String,
  },
  role: {
    required: true,
    type: String,
    enum: ["dev", "athlete", "visitor", "admin"],
  },
});

module.exports = userSchema;
