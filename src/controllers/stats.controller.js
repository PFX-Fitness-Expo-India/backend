const eventModel = require("../models/event.model");
const ticketModel = require("../models/ticket.model");
const CommonResponse = require("../utils/common.response");

/**
 * Get Expo Statistics
 * GET /api/stats
 */
const getStats = async (req, res) => {
  try {
    const [eventCount, athleteCount, visitorCount] = await Promise.all([
      eventModel.countDocuments(),
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

module.exports = {
  getStats,
};
