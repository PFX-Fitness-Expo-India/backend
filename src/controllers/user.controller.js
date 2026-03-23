const userModel = require("../models/user.model");
const CommonResponse = require("../utils/common.response");

/**
 * Get all users with optional role filtering
 * GET /api/users?role=visitor
 * GET /api/users?role=athlete
 */
const getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = {};

    if (role) {
      filter.role = role;
    }

    const users = await userModel
      .find(filter)
      .select("-password -refreshToken -resetPasswordToken -resetPasswordExpires");

    return res
      .status(200)
      .json(new CommonResponse(200, "Users fetched successfully", users));
  } catch (error) {
    console.error("Get users error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

module.exports = {
  getUsers,
};
