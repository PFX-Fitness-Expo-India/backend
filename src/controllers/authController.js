const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const userModel = require("../models/userModel");
const CommonResponse = require("../utils/commonResponse");

const login = async (req, res) => {
  try {
    const { credentials, password } = req.body;

    if (credentials.includes("@")) {
      const user = await userModel.findOne({ email: credentials });

      if (!user) {
        return res
          .status(404)
          .json(new CommonResponse(404, "User not found", null));
      }
    } else {
      const user = await userModel.findOne({ phoneNumber: credentials });

      if (!user) {
        return res
          .status(404)
          .json(new CommonResponse(404, "User not found", null));
      }
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res
        .status(401)
        .json(new CommonResponse(401, "Invalid password", null));
    }

    return res
      .status(200)
      .json(new CommonResponse(200, "Login successful", null));
  } catch (error) {
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const signup = async (req, res) => {
  try {
    const { userName, phoneNumber, email, password } = req.body;

    const userPhone = await userModel.findOne({ phoneNumber });
    const userMail = await userModel.findOne({ email });
    if (userPhone || userMail) {
      return res
        .status(409)
        .json(new CommonResponse(409, "User already exists", null));
    }

    const user = new userModel({
      userName,
      phoneNumber,
      email,
      password,
    });

    await user.save();

    return res
      .status(201)
      .json(new CommonResponse(201, "User created successfully", null));
  } catch (error) {
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

module.exports = { login, signup };
