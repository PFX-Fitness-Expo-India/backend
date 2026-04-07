const ticketModel = require("../models/ticket.model");
const visitorModel = require("../models/visitor.model");
const registrationModel = require("../models/registration.model");
const CommonResponse = require("../utils/common.response");

const getTickets = async (req, res) => {
  try {
    const tickets = await ticketModel
      .find()
      .populate("userId", "userName email phoneNumber")
      .populate("eventId", "eventName eventDate eligibility");

    return res
      .status(200)
      .json(new CommonResponse(200, "Tickets fetched successfully", tickets));
  } catch (error) {
    console.error("Get tickets error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await ticketModel
      .findById(id)
      .populate("userId", "userName email phoneNumber")
      .populate("eventId", "eventName eventDate eligibility");

    if (!ticket) {
      return res
        .status(404)
        .json(new CommonResponse(404, "Ticket not found", null));
    }

    return res
      .status(200)
      .json(new CommonResponse(200, "Ticket fetched successfully", ticket));
  } catch (error) {
    console.error("Get ticket by id error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const getTicketsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const tickets = await ticketModel
      .find({ userId })
      .populate("eventId", "eventName eventDate eligibility");

    return res
      .status(200)
      .json(
        new CommonResponse(200, "User tickets fetched successfully", tickets),
      );
  } catch (error) {
    console.error("Get tickets by user id error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const updateTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status } = req.body;

    if (!["unused", "used", "cancelled"].includes(status)) {
      return res
        .status(400)
        .json(new CommonResponse(400, "Invalid status", null));
    }

    const ticket = await ticketModel.findById(ticketId);
    if (!ticket) {
      return res
        .status(404)
        .json(new CommonResponse(404, "Ticket not found", null));
    }

    if (ticket.status !== "unused") {
      return res
        .status(400)
        .json(
          new CommonResponse(
            400,
            `Ticket has already been ${ticket.status} and cannot be updated`,
            ticket,
          ),
        );
    }

    const oldStatus = ticket.status;
    ticket.status = status;
    ticket.statusUpdatedAt = new Date();
    await ticket.save();

    // If marked as "used", update the corresponding attendance record
    if (status === "used" && oldStatus !== "used") {
      const attendanceData = {
        isAttendingEvent: "present",
        attendanceTimeStamp: new Date(),
      };

      if (ticket.ticketType === "athlete") {
        await registrationModel.findOneAndUpdate(
          { 
            userId: ticket.userId, 
            eventId: ticket.eventId, 
            subcategory: ticket.subcategory 
          },
          attendanceData
        );
      } else {
        await visitorModel.findOneAndUpdate(
          { 
            userId: ticket.userId, 
            eventId: ticket.eventId, 
            ticketType: ticket.ticketType 
          },
          attendanceData
        );
      }
    }

    return res
      .status(200)
      .json(
        new CommonResponse(200, "Ticket status updated successfully", ticket),
      );
  } catch (error) {
    console.error("Update ticket status error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const verifyTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await ticketModel
      .findOne({ ticketId })
      .populate("userId", "userName email phoneNumber")
      .populate("eventId", "eventName eventDate eligibility");

    if (!ticket) {
      return res
        .status(404)
        .json(new CommonResponse(404, "Ticket not found", null));
    }

    const responseData = {
      ...ticket._doc,
      isUsed: ticket.status === "used",
      isCancelled: ticket.status === "cancelled",
      canUse: ticket.status === "unused",
      isAthlete: ticket.ticketType === "athlete",
    };

    const message = ticket.ticketType === "athlete" 
      ? "Ticket verification successful - This is an athlete ticket" 
      : "Ticket verification successful";

    return res
      .status(200)
      .json(
        new CommonResponse(
          200,
          message,
          responseData,
        ),
      );
  } catch (error) {
    console.error("Verify ticket error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const getMyTickets = async (req, res) => {
  try {
    const userId = req.user.userId;
    const tickets = await ticketModel
      .find({ userId })
      .populate("eventId", "eventName eventDate eligibility")
      .sort({ issuedAt: -1 });

    return res
      .status(200)
      .json(
        new CommonResponse(200, "Your tickets fetched successfully", tickets),
      );
  } catch (error) {
    console.error("Get my tickets error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

module.exports = {
  getTickets,
  getTicketById,
  getTicketsByUserId,
  getMyTickets,
  updateTicketStatus,
  verifyTicket,
};
