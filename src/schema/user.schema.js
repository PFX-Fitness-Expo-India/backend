const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
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
      lowercase: true,
      trim: true,
    },
    password: {
      required: true,
      type: String,
    },
    gender: {
      type: String,
      enum: ["male", "female"],
    },
    age: {
      type: Number,
    },
    weight: {
      type: Number,
    },
    height: {
      type: Number,
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
  },
  { timestamps: true },
);

module.exports = userSchema;
