const eventModel = require("../models/event.model");
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
        new CommonResponse(
          200,
          "Event active status updated successfully",
          event,
        ),
      );
  } catch (error) {
    console.error("Update event active status error details:", {
      message: error.message,
      stack: error.stack,
      raw: error
    });
    if (error.name === "CastError") {
      return res
        .status(400)
        .json(new CommonResponse(400, "Invalid Event ID format", null));
    }
    return res
      .status(500)
      .json(new CommonResponse(500, `Internal server error: ${error.message}`, null));
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

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  updateEventActiveStatus,
};
