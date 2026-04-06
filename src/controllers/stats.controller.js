const eventModel = require("../models/event.model");
const ticketModel = require("../models/ticket.model");
const paymentModel = require("../models/payment.model");
const registrationModel = require("../models/registration.model");
const CommonResponse = require("../utils/common.response");

/**
 * Get Expo Statistics
 * GET /api/stats
 */
const getStats = async (req, res) => {
  try {
    const [eventCount, athleteCount, visitorCount] = await Promise.all([
      eventModel.countDocuments({ isActive: true }),
      ticketModel.countDocuments({ ticketType: "athlete" }),
      ticketModel.countDocuments({ ticketType: { $ne: "athlete" } }),
    ]);

    const stats = {
      sportsCompetitions: eventCount,
      athletes: athleteCount > 500 ? `${athleteCount}+` : athleteCount,
      visitors: visitorCount,
      prizePool: "Huge",
    };

    return res
      .status(200)
      .json(new CommonResponse(200, "Statistics fetched successfully", stats));
  } catch (error) {
    console.error("Get stats error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

/**
 * Get Total Payments Received
 * GET /api/stats/revenue
 */
const getTotalPaymentsReceived = async (req, res) => {
  try {
    const result = await paymentModel.aggregate([
      { $match: { paymentStatus: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const total = result.length > 0 ? result[0].total : 0;

    return res
      .status(200)
      .json(
        new CommonResponse(200, "Total payments fetched successfully", {
          totalRevenue: total,
          currency: "INR",
        }),
      );
  } catch (error) {
    console.error("Get total payments error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

/**
 * Get Detailed Stats per Event
 * GET /api/stats/events
 */
const getEventStats = async (req, res) => {
  try {
    // Pipeline to aggregate counts per event
    const events = await eventModel.find({}).lean();

    const [registrationStats, paymentStats] = await Promise.all([
      registrationModel.aggregate([
        { $group: { _id: "$eventId", totalAthletes: { $sum: 1 } } },
      ]),
      paymentModel.aggregate([
        { $match: { paymentStatus: "completed" } },
        { $group: { _id: "$eventId", totalRevenue: { $sum: "$amount" } } },
      ]),
    ]);

    const statsMap = events.map((event) => {
      const regStat = registrationStats.find(
        (rs) => rs._id && rs._id.toString() === event._id.toString(),
      );
      const payStat = paymentStats.find(
        (ps) => ps._id && ps._id.toString() === event._id.toString(),
      );

      return {
        _id: event._id,
        eventId: event.eventId,
        eventName: event.eventName,
        haveSubcategory: event.haveSubcategory,
        subcategories: event.subcategories || [],
        totalAthletes: regStat ? regStat.totalAthletes : 0,
        totalRevenue: payStat ? payStat.totalRevenue : 0,
      };
    });

    return res
      .status(200)
      .json(
        new CommonResponse(200, "Event statistics fetched successfully", statsMap),
      );
  } catch (error) {
    console.error("Get event statistics error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

module.exports = {
  getStats,
  getTotalPaymentsReceived,
  getEventStats,
};
