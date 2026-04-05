const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const crypto = require("crypto");
require("dotenv").config();
const userModel = require("../models/user.model");
const CommonResponse = require("../utils/common.response");
const sendEmail = require("../utils/email.util");

const login = async (req, res) => {
  try {
    const { credentials, password } = req.body;

    if (!credentials || !password) {
      return res
        .status(400)
        .json(
          new CommonResponse(
            400,
            "Credentials and password are required",
            null,
          ),
        );
    }

    let user;

    if (validator.isEmail(credentials)) {
      user = await userModel.findOne({ email: credentials });
    } else if (validator.isMobilePhone(credentials, "any")) {
      user = await userModel.findOne({ phoneNumber: credentials });
    } else {
      return res
        .status(400)
        .json(
          new CommonResponse(400, "Invalid email or phone number format", null),
        );
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

    if (!user.isVerified) {
      return res
        .status(403)
        .json(
          new CommonResponse(
            403,
            "Please verify your email address before logging in",
            null,
          ),
        );
    }

    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "1d" },
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET || "refresh_secret",
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "10d" },
    );

    user.refreshToken = refreshToken;
    await user.save();

    return res.status(200).json(
      new CommonResponse(200, "Login successful", {
        token: accessToken,
        refreshToken,
        userId: user._id,
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
    // Whitelist: only "visitor" and "athlete" are allowed from user input.
    // "admin" and "dev" must never be self-assigned — they are silently blocked.
    const ALLOWED_SIGNUP_ROLES = ["visitor", "athlete"];
    const safeRole = ALLOWED_SIGNUP_ROLES.includes(role) ? role : "visitor";

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
        .json(
          new CommonResponse(
            400,
            "Password must be at least 6 characters long",
            null,
          ),
        );
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

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    const user = new userModel({
      userName,
      phoneNumber,
      email,
      password: hashedPassword,
      role: safeRole, // only "visitor" or "athlete" — admin/dev are blocked
      verificationToken,
      verificationTokenExpires,
    });

    await user.save();

    // Verification URL
    // const verificationUrl = `${req.protocol}://${req.get("host")}/api/auth/verify-email/${verificationToken}`;
    const verificationUrl = `https://pfx-fe.vercel.app/verify-email/${verificationToken}`;

    const message = `Welcome to PFX Fitness Expo! Please verify your email by clicking the link below:\n\n ${verificationUrl}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #333; text-align: center;">Welcome to PFX Fitness Expo!</h2>
        <p style="color: #555; text-align: center;">Please verify your email address to complete your registration.</p>
        <div style="text-align: center; margin-top: 30px;">
          <a href="${verificationUrl}" style="background-color: #ff4500; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Verify Email</a>
        </div>
        <p style="color: #888; font-size: 12px; margin-top: 30px; text-align: center;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${verificationUrl}" style="color: #ff4500;">${verificationUrl}</a>
        </p>
      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: "Email Verification - PFX Fitness Expo",
        message,
        html,
      });

      return res.status(201).json(
        new CommonResponse(
          201,
          "User created successfully. Please check your email to verify your account.",
          null,
        ),
      );
    } catch (err) {
      console.error("Signup email error:", err);
      // We still created the user, but email failed. User can request resend later if we implement it.
      return res.status(201).json(
        new CommonResponse(
          201,
          "User created, but verification email could not be sent. Please contact support.",
          null,
        ),
      );
    }
  } catch (error) {
    console.error("Signup error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res
        .status(400)
        .json(new CommonResponse(400, "Refresh token is required", null));
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || "refresh_secret",
    );

    const user = await userModel.findById(decoded.userId);

    if (!user || user.refreshToken !== refreshToken) {
      return res
        .status(401)
        .json(new CommonResponse(401, "Invalid refresh token", null));
    }

    const newAccessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "1d" },
    );

    return res.status(200).json(
      new CommonResponse(200, "Token refreshed successfully", {
        token: newAccessToken,
      }),
    );
  } catch (error) {
    console.error("Refresh token error:", error);
    return res
      .status(401)
      .json(new CommonResponse(401, "Invalid or expired refresh token", null));
  }
};

const logout = async (req, res) => {
  try {
    const userId = req.user.userId;

    await userModel.findByIdAndUpdate(userId, { refreshToken: null });

    return res
      .status(200)
      .json(new CommonResponse(200, "Logout successful", null));
  } catch (error) {
    console.error("Logout error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json(new CommonResponse(400, "Old and new passwords are required", null));
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json(new CommonResponse(404, "User not found", null));
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json(new CommonResponse(401, "Invalid old password", null));
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res
      .status(200)
      .json(new CommonResponse(200, "Password changed successfully", null));
  } catch (error) {
    console.error("Change password error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json(new CommonResponse(400, "Email is required", null));
    }

    const user = await userModel.findOne({ email });

    // Security: always respond with 200 regardless of whether the email exists.
    // Returning 404 reveals which emails are registered (email enumeration attack).
    if (!user) {
      return res
        .status(200)
        .json(new CommonResponse(200, "If this email is registered, a reset link has been sent.", null));
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    // Reset URL
    // const resetUrl = `${req.protocol}://${req.get("host")}/api/auth/reset-password/${resetToken}`;
     const resetUrl = `https://pfx-fe.vercel.app/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) have requested the reset of a password. Please use the button below to reset your password: \n\n ${resetUrl}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
        <p style="color: #555; text-align: center;">You requested a password reset for your PFX Fitness Expo account. Click the button below to set a new password:</p>
        <div style="text-align: center; margin-top: 30px;">
          <a href="${resetUrl}" style="background-color: #ff4500; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #888; font-size: 12px; margin-top: 30px; text-align: center;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${resetUrl}" style="color: #ff4500;">${resetUrl}</a>
        </p>
        <p style="color: #555; text-align: center; font-size: 12px; margin-top: 10px;">This link will expire in 10 minutes.</p>
      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: "Password Reset Token",
        message,
        html,
      });

      return res
        .status(200)
        .json(new CommonResponse(200, "Email sent successfully", null));
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      console.error("Forgot password email error:", err);
      return res
        .status(500)
        .json(new CommonResponse(500, "Email could not be sent", null));
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res
        .status(400)
        .json(new CommonResponse(400, "New password is required", null));
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await userModel.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json(new CommonResponse(400, "Invalid or expired reset token", null));
    }

    // Set new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res
      .status(200)
      .json(new CommonResponse(200, "Password reset successful", null));
  } catch (error) {
    console.error("Reset password error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const getUserInfo = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json(new CommonResponse(400, "Invalid user ID format", null));
    }

    const user = await userModel.findById(id).select("-password -refreshToken -resetPasswordToken -resetPasswordExpires");

    if (!user) {
      return res
        .status(404)
        .json(new CommonResponse(404, "User not found", null));
    }

    return res.status(200).json(
      new CommonResponse(200, "User information fetched successfully", user),
    );
  } catch (error) {
    console.error("Get user info error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await userModel.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json(new CommonResponse(400, "Invalid or expired verification token", null));
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;

    await user.save();

    return res
      .status(200)
      .json(new CommonResponse(200, "Email verified successfully. You can now log in.", null));
  } catch (error) {
    console.error("Verify email error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};


module.exports = {
  login,
  signup,
  refreshAccessToken,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
  getUserInfo,
  verifyEmail,
};
