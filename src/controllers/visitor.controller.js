const visitorModel = require("../models/visitor.model");
const CommonResponse = require("../utils/common.response");
const userModel = require("../models/user.model");
const { issueTicket } = require("../utils/ticket.util");
const eventModel = require("../models/event.model"); // May need eventId

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

    // Issue ticket (assuming admin creation or immediate issuance)
    // We need an eventId. For visitors, maybe there's a default event or we get it from body.
    // Looking at the schema, visitor doesn't have eventId, but athlete does.
    // However, the Ticket model requires eventId.
    // I'll check if eventId is in req.body.
    const { eventId } = req.body;
    if (eventId) {
      await issueTicket(userId, eventId, ticketType);
    }

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

const getListOfVisitors = async (req, res) => {
  try {
    const { page = 1, limit = 10, ticketType, attendance } = req.query;

    const filter = {};
    if (ticketType) filter.ticketType = ticketType;
    if (attendance) filter.isAttendingEvent = attendance;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalCount = await visitorModel.countDocuments(filter);
    const visitors = await visitorModel
      .find(filter)
      .populate("userId", "userName email")
      .skip(skip)
      .limit(parseInt(limit));

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    return res.status(200).json(
      new CommonResponse(200, "Visitors fetched successfully", {
        visitors,
        pagination: {
          totalCount,
          totalPages,
          currentPage: parseInt(page),
          limit: parseInt(limit),
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
};
