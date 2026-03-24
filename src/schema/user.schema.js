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
  refreshToken: {
    type: String,
    default: null,
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: String,
  verificationTokenExpires: Date,
});

module.exports = userSchema;
