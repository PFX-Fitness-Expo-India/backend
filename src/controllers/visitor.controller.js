const visitorModel = require("../models/visitor.model");
const CommonResponse = require("../utils/common.response");
const userModel = require("../models/user.model");

const createVisitor = async (req, res) => {
  try {
    const { userId, ticketType } = req.body;

    const user = await userModel.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json(new CommonResponse(404, "User not found", null));
    }

    const visitor = new visitorModel({
      userId,
      ticketType,
    });

    await visitor.save();

    return res
      .status(201)
      .json(new CommonResponse(201, "Visitor created successfully", visitor));
  } catch (error) {
    console.error("Create visitor error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const getVisitors = async (req, res) => {
  try {
    const visitors = await visitorModel.find();
    return res
      .status(200)
      .json(new CommonResponse(200, "Visitors fetched successfully", visitors));
  } catch (error) {
    console.error("Get visitors error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const getVisitorById = async (req, res) => {
  try {
    const { id } = req.params;
    const visitor = await visitorModel.findById(id);

    if (!visitor) {
      return res
        .status(404)
        .json(new CommonResponse(404, "Visitor not found", null));
    }

    return res
      .status(200)
      .json(new CommonResponse(200, "Visitor fetched successfully", visitor));
  } catch (error) {
    console.error("Get visitor by id error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const updateVisitorAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { isAttendingEvent } = req.body;

    if (!["notPresent", "present", "attending"].includes(isAttendingEvent)) {
      return res
        .status(400)
        .json(new CommonResponse(400, "Invalid attendance status", null));
    }

    const visitor = await visitorModel.findOneAndUpdate(
      { userId: id },
      { isAttendingEvent },
    );

    if (!visitor) {
      return res
        .status(404)
        .json(new CommonResponse(404, "Visitor not found", null));
    }

    return res
      .status(200)
      .json(
        new CommonResponse(
          200,
          "Visitor attendance updated successfully",
          visitor,
        ),
      );
  } catch (error) {
    console.error("Update visitor attendance error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const deleteVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    const visitor = await visitorModel.findByIdAndDelete(id);

    if (!visitor) {
      return res
        .status(404)
        .json(new CommonResponse(404, "Visitor not found", null));
    }

    return res
      .status(200)
      .json(new CommonResponse(200, "Visitor deleted successfully", null));
  } catch (error) {
    console.error("Delete visitor error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const getVisitorCount = async (req, res) => {
  try {
    const count = await visitorModel.countDocuments();
    return res
      .status(200)
      .json(
        new CommonResponse(200, "Visitor count fetched successfully", count),
      );
  } catch (error) {
    console.error("Get visitor count error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

module.exports = {
  createVisitor,
  getVisitors,
  getVisitorById,
  updateVisitorAttendance,
  deleteVisitor,
  getVisitorCount,
};
