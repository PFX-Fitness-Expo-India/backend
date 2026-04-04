const eventModel = require("../models/event.model");
const ticketModel = require("../models/ticket.model");
const CommonResponse = require("../utils/common.response");

const updateEventActiveStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await eventModel.findById(id);

    if (!event) {
      return res
        .status(404)
        .json(new CommonResponse(404, "Event not found", null));
    }

    event.isActive = !event.isActive;
    await event.save();

    return res
      .status(200)
      .json(
        new CommonResponse(200, "Event active status updated successfully", {
          isActive: event.isActive,
        }),
      );
  } catch (error) {
    console.error("Update event active status error details:", {
      message: error.message,
      stack: error.stack,
      raw: error,
    });
    if (error.name === "CastError") {
      return res
        .status(400)
        .json(new CommonResponse(400, "Invalid Event ID format", null));
    }
    return res
      .status(500)
      .json(
        new CommonResponse(
          500,
          `Internal server error: ${error.message}`,
          null,
        ),
      );
  }
};

const createEvent = async (req, res) => {
  try {
    const {
      eventName,
      eventDate,
      eventTime,
      eventDescription,
      eventLocation,
      eventCapacity,
      eventPrice,
      eventImage,
      paymentMethod,
      haveSubcategory,
      subcategories,
      daySubtitle,
      dayNumber,
      eligibility,
      eventRules,
    } = req.body;

    const event = new eventModel({
      eventName,
      eventDate,
      eventTime,
      eventDescription,
      eventLocation,
      eventCapacity,
      eventPrice,
      eventImage,
      paymentMethod,
      haveSubcategory,
      subcategories,
      daySubtitle,
      dayNumber,
      eligibility,
      eventRules,
    });

    await event.save();

    return res
      .status(201)
      .json(new CommonResponse(201, "Event created successfully", event));
  } catch (error) {
    console.error("Create event error:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json(new CommonResponse(400, error.message, null));
    }
    if (error.code === 11000) {
      return res
        .status(409)
        .json(new CommonResponse(409, "Event ID already exists", null));
    }
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const getEvents = async (req, res) => {
  try {
    const events = await eventModel.find();
    return res
      .status(200)
      .json(new CommonResponse(200, "Events fetched successfully", events));
  } catch (error) {
    console.error("Get events error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const getEventSchedule = async (req, res) => {
  try {
    const events = await eventModel
      .find({ isActive: true })
      .sort({ dayNumber: 1, eventTime: 1 });

    const scheduleMap = {};

    events.forEach((event) => {
      const dayKey = `day_${event.dayNumber}`;
      if (!scheduleMap[dayKey]) {
        const dateObj = new Date(event.eventDate);
        const dayName = dateObj.toLocaleDateString("en-US", {
          weekday: "long",
        }).toUpperCase();

        scheduleMap[dayKey] = {
          dayNumber: event.dayNumber,
          dayName: dayName,
          date: event.eventDate,
          subtitle: event.daySubtitle || "",
          events: [],
        };
      }

      scheduleMap[dayKey].events.push({
        eventId: event.eventId,
        eventName: event.eventName,
        eventLocation: event.eventLocation,
        eventTime: event.eventTime,
        eventDescription: event.eventDescription,
        eventImage: event.eventImage,
        eventPrice: event.eventPrice,
        haveSubcategory: event.haveSubcategory,
        subcategories: event.subcategories,
        eligibility: event.eligibility || [],
        eventRules: event.eventRules || [],
      });
    });

    const days = Object.values(scheduleMap);

    return res.status(200).json(
      new CommonResponse(200, "Schedule fetched successfully", {
        title: "THREE DAYS OF NON-STOP ACTION",
        days: days,
      }),
    );
  } catch (error) {
    console.error("Get event schedule error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await eventModel.findById(id);

    if (!event) {
      return res
        .status(404)
        .json(new CommonResponse(404, "Event not found", null));
    }

    return res
      .status(200)
      .json(new CommonResponse(200, "Event fetched successfully", event));
  } catch (error) {
    console.error("Get event by id error:", error);
    if (error.name === "CastError") {
      return res
        .status(400)
        .json(new CommonResponse(400, "Invalid Event ID format", null));
    }
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const event = await eventModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!event) {
      return res
        .status(404)
        .json(new CommonResponse(404, "Event not found", null));
    }

    return res
      .status(200)
      .json(new CommonResponse(200, "Event updated successfully", event));
  } catch (error) {
    console.error("Update event error:", error);
    if (error.name === "CastError") {
      return res
        .status(400)
        .json(new CommonResponse(400, "Invalid Event ID format", null));
    }
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await eventModel.findByIdAndDelete(id);

    if (!event) {
      return res
        .status(404)
        .json(new CommonResponse(404, "Event not found", null));
    }

    return res
      .status(200)
      .json(new CommonResponse(200, "Event deleted successfully", null));
  } catch (error) {
    console.error("Delete event error:", error);
    if (error.name === "CastError") {
      return res
        .status(400)
        .json(new CommonResponse(400, "Invalid Event ID format", null));
    }
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const getEventParticipants = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, page = 1, limit = 10 } = req.query;

    const filter = { eventId: id };

    if (type === "athlete") {
      filter.ticketType = "athlete";
    } else if (type === "visitor") {
      filter.ticketType = { $ne: "athlete" };
    }

    const currentPage = parseInt(page);
    const currentLimit = parseInt(limit);
    const skip = (currentPage - 1) * currentLimit;

    const totalCount = await ticketModel.countDocuments(filter);
    const participants = await ticketModel
      .find(filter)
      .populate("userId", "userName email phoneNumber")
      .sort({ issuedAt: -1 })
      .skip(skip)
      .limit(currentLimit);

    const totalPages = Math.ceil(totalCount / currentLimit);

    return res.status(200).json(
      new CommonResponse(200, "Participants fetched successfully", {
        participants,
        pagination: {
          totalCount,
          totalPages,
          currentPage,
          limit: currentLimit,
        },
      }),
    );
  } catch (error) {
    console.error("Get event participants error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  updateEventActiveStatus,
  getEventParticipants,
  getEventSchedule,
};
