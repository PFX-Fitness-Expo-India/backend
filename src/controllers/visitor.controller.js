const visitorModel = require("../models/visitor.model");
const CommonResponse = require("../utils/common.response");
const userModel = require("../models/user.model");
const { issueTicket } = require("../utils/ticket.util");
const eventModel = require("../models/event.model"); // May need eventId

const createVisitor = async (req, res) => {
  try {
    const { userId, eventId, ticketType } = req.body;

    const user = await userModel.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json(new CommonResponse(404, "User not found", null));
    }

    // Check for existing pending registration for this user and ticketType to avoid duplicates
    const query = {
      userId,
      ticketType,
      paymentStatus: "pending",
    };
    if (eventId) query.eventId = eventId;

    const existingPendingVisitor = await visitorModel.findOne(query);

    if (existingPendingVisitor) {
      // If a pending registration for the exact ticketType already exists, return it
      return res
        .status(200)
        .json(
          new CommonResponse(
            200,
            "Pending registration for this ticket type already exists",
            existingPendingVisitor,
          ),
        );
    }

    // If a completed registration exists, we still allow creating a new one (e.g., for a different ticket type)
    // If a pending registration for a *different* ticket type exists, we also allow creating a new one.

    const visitorData = {
      userId,
      ticketType,
      paymentStatus: "pending",
    };
    if (eventId) visitorData.eventId = eventId;

    const visitor = new visitorModel(visitorData);

    await visitor.save();

    return res
      .status(201)
      .json(new CommonResponse(201, "Visitor registration initiated", visitor));
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

    const updateData = { isAttendingEvent };
    if (["present", "attending"].includes(isAttendingEvent)) {
      updateData.attendanceTimeStamp = new Date();
    }

    const visitor = await visitorModel.findOneAndUpdate(
      { userId: id },
      updateData,
      { new: true },
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

const getAllVisitor = async (req, res) => {
  try {
    const getUsers = await userModel.find({ role: "visitor" });
    return res
      .status(200)
      .json(new CommonResponse(200, "Visitors fetched successfully", getUsers));
  } catch (error) {
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
    const count = await visitorModel.countDocuments({
      paymentStatus: "completed",
    });
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

const getListOfVisitors = async (req, res) => {
  try {
    const { page = 1, limit = 10, ticketType, attendance, search } = req.query;

    const filter = {};
    if (ticketType) filter.ticketType = ticketType;

    // Attendance mapping: present/absent
    if (attendance === "present") {
      filter.isAttendingEvent = { $in: ["present", "attending"] };
    } else if (attendance === "absent") {
      filter.isAttendingEvent = "notPresent";
    } else if (attendance) {
      filter.isAttendingEvent = attendance;
    }

    // Search mapping: mail or mobile number
    if (search) {
      const users = await userModel.find({
        $or: [
          { email: { $regex: search, $options: "i" } },
          { phoneNumber: { $regex: search, $options: "i" } },
          { userName: { $regex: search, $options: "i" } },
        ],
      });
      const userIds = users.map((u) => u._id);
      filter.userId = { $in: userIds };
    }

    const currentPage = parseInt(page);
    const currentLimit = parseInt(limit);
    const skip = (currentPage - 1) * currentLimit;

    const totalCount = await visitorModel.countDocuments(filter);
    const visitors = await visitorModel
      .find(filter)
      .populate("userId", "userName email phoneNumber")
      .sort({ timeStamp: -1 })
      .skip(skip)
      .limit(currentLimit);

    const totalPages = Math.ceil(totalCount / currentLimit);

    return res.status(200).json(
      new CommonResponse(200, "Visitors fetched successfully", {
        visitors,
        pagination: {
          totalCount,
          totalPages,
          currentPage,
          limit: currentLimit,
        },
      }),
    );
  } catch (error) {
    console.error("Get visitors error:", error);
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
  getListOfVisitors,
  getAllVisitor,
};
