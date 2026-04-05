const registrationModel = require("../models/registration.model");
const userModel = require("../models/user.model");
const eventModel = require("../models/event.model");
const CommonResponse = require("../utils/common.response");
const { issueTicket } = require("../utils/ticket.util");

const createRegistration = async (req, res) => {
  try {
    const { userId, eventId, age, gender, weight, subcategory, paymentMethod } = req.body;

    if (!eventId) {
      return res
        .status(400)
        .json(new CommonResponse(400, "Event ID is required for athlete registration", null));
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json(new CommonResponse(404, "User not found", null));
    }

    // Check for an existing PENDING registration for this user + event (mirror visitor behaviour)
    const query = {
      userId,
      eventId,
      paymentStatus: "pending",
    };

    const existingPendingRegistration = await registrationModel.findOne(query);

    if (existingPendingRegistration) {
      // Return the existing pending registration so the frontend can use its _id for create-order
      return res
        .status(200)
        .json(
          new CommonResponse(
            200,
            "Pending registration for this event already exists",
            existingPendingRegistration,
          ),
        );
    }

    // Create a fresh registration — paymentStatus: pending, NO ticket issued yet
    const registration = new registrationModel({
      userId,
      eventId,
      age,
      gender,
      weight,
      subcategory,
      status: "pending",
      paymentMethod: paymentMethod || "online",
      paymentStatus: "pending",
    });

    await registration.save();

    return res
      .status(201)
      .json(
        new CommonResponse(201, "Athlete registration initiated", registration),
      );
  } catch (error) {
    console.error("Create registration error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const getRegistrations = async (req, res) => {
  try {
    const {
      status,
      paymentStatus,
      paymentMethod,
      gender,
      eventId,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (gender) filter.gender = gender;
    if (eventId) {
      const mongoose = require("mongoose");
      if (mongoose.Types.ObjectId.isValid(eventId)) {
        filter.eventId = new mongoose.Types.ObjectId(eventId);
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: "$userDetails" },
      {
        $lookup: {
          from: "events",
          localField: "eventId",
          foreignField: "_id",
          as: "eventDetails",
        },
      },
      { $unwind: { path: "$eventDetails", preserveNullAndEmptyArrays: true } },
    ];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { "userDetails.userName": { $regex: search, $options: "i" } },
            { "userDetails.email": { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    // Clone pipeline for count
    const countPipeline = [...pipeline, { $count: "total" }];
    
    // Add pagination to main pipeline
    pipeline.push({ $sort: { timeStamp: -1 } });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limitNum });

    // Project consistent fields
    pipeline.push({
      $project: {
        _id: 1,
        age: 1,
        gender: 1,
        weight: 1,
        subcategory: 1,
        status: 1,
        paymentStatus: 1,
        paymentMethod: 1,
        timeStamp: 1,
        userId: {
          _id: "$userDetails._id",
          userName: "$userDetails.userName",
          email: "$userDetails.email",
          phoneNumber: "$userDetails.phoneNumber",
        },
        eventId: {
          _id: "$eventDetails._id",
          eventName: "$eventDetails.eventName",
          eligibility: "$eventDetails.eligibility",
        },
      },
    });

    const [registrations, totalCount] = await Promise.all([
      registrationModel.aggregate(pipeline),
      registrationModel.aggregate(countPipeline),
    ]);

    const total = totalCount.length > 0 ? totalCount[0].total : 0;

    return res.status(200).json(
      new CommonResponse(200, "Registrations fetched successfully", {
        registrations,
        pagination: {
          total,
          page: parseInt(page),
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      })
    );
  } catch (error) {
    console.error("Get registrations error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const getRegistrationById = async (req, res) => {
  try {
    const { id } = req.params;
    const registration = await registrationModel
      .findById(id)
      .populate("userId", "userName email phoneNumber")
      .populate("eventId", "eventName eligibility");

    if (!registration) {
      return res
        .status(404)
        .json(new CommonResponse(404, "Registration not found", null));
    }

    return res
      .status(200)
      .json(
        new CommonResponse(
          200,
          "Registration fetched successfully",
          registration,
        ),
      );
  } catch (error) {
    console.error("Get registration by id error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const updateRegistrationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res
        .status(400)
        .json(new CommonResponse(400, "Invalid status", null));
    }

    const registration = await registrationModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );

    if (!registration) {
      return res
        .status(404)
        .json(new CommonResponse(404, "Registration not found", null));
    }

    return res
      .status(200)
      .json(
        new CommonResponse(
          200,
          "Registration status updated successfully",
          registration,
        ),
      );
  } catch (error) {
    console.error("Update registration status error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const deleteRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const registration = await registrationModel.findByIdAndDelete(id);

    if (!registration) {
      return res
        .status(404)
        .json(new CommonResponse(404, "Registration not found", null));
    }

    return res
      .status(200)
      .json(new CommonResponse(200, "Registration deleted successfully", null));
  } catch (error) {
    console.error("Delete registration error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const getAtheleteCount = async (req, res) => {
  try {
    const count = await registrationModel.countDocuments();
    return res
      .status(200)
      .json(
        new CommonResponse(200, "Athelete count fetched successfully", count),
      );
  } catch (error) {
    console.error("Get athelete count error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const addAtheleteToEvent = async (req, res) => {
  try {
    const { eventId, userMail, age, gender, weight, subcategory, paymentMethod } = req.body;

    if (!eventId) {
      return res
        .status(400)
        .json(new CommonResponse(400, "Event ID is required to add athlete to event", null));
    }

    const user = await userModel.findOne({ email: userMail });
    if (!user) {
      return res
        .status(404)
        .json(new CommonResponse(404, "User not found", null));
    }

    let event = null;
    if (eventId) {
      event = await eventModel.findById(eventId);
      if (!event) {
        return res
          .status(404)
          .json(new CommonResponse(404, "Event not found", null));
      }
    }

    const registrationData = {
      userId: user._id,
      eventId,
      age,
      gender,
      weight,
      subcategory,
      status: "pending",
      paymentMethod: paymentMethod || "offline",
      paymentStatus: paymentMethod === "online" ? "pending" : "completed",
    };

    const registration = new registrationModel(registrationData);

    await registration.save();

    // Issue ticket immediately only if not online payment
    if (paymentMethod !== "online") {
      await issueTicket(user._id, eventId, "athlete", subcategory);
      await registrationModel.findByIdAndUpdate(registration._id, { status: "approved" });
    }

    return res
      .status(201)
      .json(
        new CommonResponse(
          201,
          "Registration created successfully",
          registration,
        ),
      );
  } catch (error) {
    console.error("Add athelete to event error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

/**
 * POST /registrations/issue-ticket
 * Body: { userId, eventId }
 * Issues (or re-returns) a ticket for an athlete who already has a registration.
 * Safe to call multiple times — returns existing ticket if already issued.
 */
const issueAthleteTicket = async (req, res) => {
  try {
    const { userId, eventId } = req.body;

    if (!userId || !eventId) {
      return res
        .status(400)
        .json(new CommonResponse(400, "userId and eventId are required", null));
    }

    const registration = await registrationModel.findOne({ userId, eventId });
    if (!registration) {
      return res
        .status(404)
        .json(new CommonResponse(404, "Registration not found for this user and event", null));
    }

    const ticket = await issueTicket(userId, eventId, "athlete", registration.subcategory);
    console.log(`[issueAthleteTicket] Ticket ready: ${ticket.ticketId} for userId: ${userId}`);

    return res
      .status(200)
      .json(new CommonResponse(200, "Ticket issued successfully", ticket));
  } catch (error) {
    console.error("Issue athlete ticket error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

module.exports = {
  createRegistration,
  getRegistrations,
  getRegistrationById,
  updateRegistrationStatus,
  deleteRegistration,
  getAtheleteCount,
  addAtheleteToEvent,
  issueAthleteTicket,
};
