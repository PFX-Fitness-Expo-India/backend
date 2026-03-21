const registrationModel = require("../models/registration.model");
const userModel = require("../models/user.model");
const eventModel = require("../models/event.model");
const CommonResponse = require("../utils/common.response");
const { issueTicket } = require("../utils/ticket.util");

const createRegistration = async (req, res) => {
  try {
    const { userId, eventId, age, gender, weight, paymentMethod } = req.body;

    const query = { userId, paymentStatus: "pending" };
    if (eventId) query.eventId = eventId;
    
    const existingPendingRegistration = await registrationModel.findOne(query);

    if (existingPendingRegistration) {
      existingPendingRegistration.age = age;
      existingPendingRegistration.gender = gender;
      existingPendingRegistration.weight = weight;
      existingPendingRegistration.paymentMethod = paymentMethod || "online";
      await existingPendingRegistration.save();

      return res
        .status(200)
        .json(new CommonResponse(200, "Pending registration updated", existingPendingRegistration));
    }


    const registrationData = {
      userId,
      age,
      gender,
      weight,
      status: "pending",
      paymentMethod: paymentMethod || "online",
      paymentStatus: "pending",
    };

    if (eventId) registrationData.eventId = eventId;

    const registration = new registrationModel(registrationData);

    await registration.save();

    return res
      .status(201)
      .json(
        new CommonResponse(
          201,
          "Registration initiated successfully",
          registration,
        ),
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
    const registrations = await registrationModel
      .find()
      .populate("userId", "userName email")
      .populate("eventId", "eventName");
    return res
      .status(200)
      .json(
        new CommonResponse(
          200,
          "Registrations fetched successfully",
          registrations,
        ),
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
      .populate("userId", "userName email")
      .populate("eventId", "eventName");

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
    const { eventId, userMail, age, gender, weight, paymentMethod } = req.body;

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
      age,
      gender,
      weight,
      status: "pending",
      paymentMethod: paymentMethod || "offline",
      paymentStatus: paymentMethod === "online" ? "pending" : "completed",
    };

    if (eventId) registrationData.eventId = eventId;

    const registration = new registrationModel(registrationData);

    await registration.save();

    // Issue ticket immediately only if not online payment
    if (paymentMethod !== "online") {
      await issueTicket(user._id, eventId, "athlete");
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

module.exports = {
  createRegistration,
  getRegistrations,
  getRegistrationById,
  updateRegistrationStatus,
  deleteRegistration,
  getAtheleteCount,
  addAtheleteToEvent,
};
