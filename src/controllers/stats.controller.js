const eventModel = require("../models/event.model");
const registrationModel = require("../models/registration.model");
const visitorModel = require("../models/visitor.model");
const CommonResponse = require("../utils/common.response");


const getStats = async (req, res) => {
  try {
    const [eventCount, athleteCount, visitorCount] = await Promise.all([
      eventModel.countDocuments(),
      registrationModel.countDocuments(),
      visitorModel.countDocuments({ paymentStatus: "completed" }),
    ]);

    // Constructing the stats object based on the requirements
    const stats = {
      sportsCompetitions: eventCount,
      athletes: athleteCount > 500 ? `${athleteCount}+` : athleteCount,
      visitors: visitorCount,
      prizePool: "Huge", // Static value as per requirement or could be calculated if field exists
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
