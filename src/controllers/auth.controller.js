const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const userModel = require("../models/user.model");
const CommonResponse = require("../utils/common.response");

const login = async (req, res) => {
  try {
    const { credentials, password } = req.body;

    if (!credentials || !password) {
      return res
        .status(400)
        .json(new CommonResponse(400, "Credentials and password are required", null));
    }

    let user;

    if (validator.isEmail(credentials)) {
      user = await userModel.findOne({ email: credentials });
    } else if (validator.isMobilePhone(credentials, "any")) {
      user = await userModel.findOne({ phoneNumber: credentials });
    } else {
      return res
        .status(400)
        .json(new CommonResponse(400, "Invalid email or phone number format", null));
    }

    if (!user) {
      return res
        .status(404)
        .json(new CommonResponse(404, "User not found", null));
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res
        .status(401)
        .json(new CommonResponse(401, "Invalid password", null));
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" },
    );

    return res.status(200).json(
      new CommonResponse(200, "Login successful", {
        token,
        role: user.role,
        userName: user.userName,
      }),
    );
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const signup = async (req, res) => {
  try {
    const { userName, phoneNumber, email, password, role } = req.body;

    if (!userName || !phoneNumber || !email || !password) {
      return res
        .status(400)
        .json(new CommonResponse(400, "Missing required fields", null));
    }

    if (!validator.isEmail(email)) {
      return res
        .status(400)
        .json(new CommonResponse(400, "Invalid email address", null));
    }

    if (!validator.isMobilePhone(phoneNumber, "any")) {
      return res
        .status(400)
        .json(new CommonResponse(400, "Invalid phone number", null));
    }

    if (!validator.isLength(password, { min: 6 })) {
      return res
        .status(400)
        .json(new CommonResponse(400, "Password must be at least 6 characters long", null));
    }

    const userPhone = await userModel.findOne({ phoneNumber });
    const userMail = await userModel.findOne({ email });
    if (userPhone || userMail) {
      return res
        .status(409)
        .json(new CommonResponse(409, "User already exists", null));
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = new userModel({
      userName,
      phoneNumber,
      email,
      password: hashedPassword,
      role: role || "visitor",
    });

    await user.save();

    return res
      .status(201)
      .json(new CommonResponse(201, "User created successfully", null));
  } catch (error) {
    console.error("Signup error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

module.exports = { login, signup };
