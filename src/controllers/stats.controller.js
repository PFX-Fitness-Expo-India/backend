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
    const events = await eventModel.find({}).lean();

    const [registrationStats, paymentStats] = await Promise.all([
      // Group registrations by event and subcategory
      registrationModel.aggregate([
        {
          $group: {
            _id: { eventId: "$eventId", subcategory: "$subcategory" },
            count: { $sum: 1 },
          },
        },
      ]),
      // Join payments with registrations to attribute revenue to subcategories
      paymentModel.aggregate([
        { $match: { paymentStatus: "completed" } },
        {
          $lookup: {
            from: "registrations",
            localField: "registrationId",
            foreignField: "_id",
            as: "registration",
          },
        },
        { $unwind: { path: "$registration", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: {
              eventId: "$eventId",
              subcategory: "$registration.subcategory",
            },
            revenue: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    const statsMap = events.map((event) => {
      const eventRegStats = registrationStats.filter(
        (rs) => rs._id.eventId && rs._id.eventId.toString() === event._id.toString(),
      );
      const eventPayStats = paymentStats.filter(
        (ps) => ps._id.eventId && ps._id.eventId.toString() === event._id.toString(),
      );

      const totalAthletes = eventRegStats.reduce((acc, curr) => acc + curr.count, 0);
      const totalRevenue = eventPayStats.reduce((acc, curr) => acc + curr.revenue, 0);

      let subcategoryBreakdown = [];
      if (event.haveSubcategory && event.subcategories) {
        subcategoryBreakdown = event.subcategories.map((sub) => {
          const reg = eventRegStats.find((r) => r._id.subcategory === sub);
          const pay = eventPayStats.find((p) => p._id.subcategory === sub);
          return {
            subcategory: sub,
            athletes: reg ? reg.count : 0,
            revenue: pay ? pay.revenue : 0,
          };
        });

        // Also catch any registrations that might not be in the event's subcategories array
        eventRegStats.forEach((rs) => {
          if (rs._id.subcategory && !event.subcategories.includes(rs._id.subcategory)) {
            const pay = eventPayStats.find((p) => p._id.subcategory === rs._id.subcategory);
            subcategoryBreakdown.push({
              subcategory: rs._id.subcategory,
              athletes: rs.count,
              revenue: pay ? pay.revenue : 0,
            });
          }
        });
      }

      return {
        _id: event._id,
        eventId: event.eventId,
        eventName: event.eventName,
        haveSubcategory: event.haveSubcategory,
        subcategories: event.subcategories || [],
        totalAthletes,
        totalRevenue,
        subcategoryBreakdown: subcategoryBreakdown.length > 0 ? subcategoryBreakdown : undefined,
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

/**
 * Get Specific Event Stats
 * GET /api/stats/events/:id
 */
const getSingleEventStats = async (req, res) => {
  try {
    const { id } = req.params;
    const mongoose = require("mongoose");

    // Fetch the specific event
    let event;
    if (mongoose.Types.ObjectId.isValid(id)) {
      event = await eventModel.findById(id).lean();
    } else {
      event = await eventModel.findOne({ eventId: id }).lean();
    }

    if (!event) {
      return res
        .status(404)
        .json(new CommonResponse(404, "Event not found", null));
    }

    const [registrationStats, paymentStats] = await Promise.all([
      registrationModel.aggregate([
        { $match: { eventId: event._id } },
        {
          $group: {
            _id: "$subcategory",
            count: { $sum: 1 },
          },
        },
      ]),
      paymentModel.aggregate([
        {
          $match: {
            eventId: event._id,
            paymentStatus: "completed",
          },
        },
        {
          $lookup: {
            from: "registrations",
            localField: "registrationId",
            foreignField: "_id",
            as: "registration",
          },
        },
        { $unwind: { path: "$registration", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: "$registration.subcategory",
            revenue: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    const totalAthletes = registrationStats.reduce((acc, curr) => acc + curr.count, 0);
    const totalRevenue = paymentStats.reduce((acc, curr) => acc + curr.revenue, 0);

    let subcategoryBreakdown = [];
    if (event.haveSubcategory && event.subcategories) {
      subcategoryBreakdown = event.subcategories.map((sub) => {
        const reg = registrationStats.find((r) => r._id === sub);
        const pay = paymentStats.find((p) => p._id === sub);
        return {
          subcategory: sub,
          athletes: reg ? reg.count : 0,
          revenue: pay ? pay.revenue : 0,
        };
      });

      // Catch "unofficial" subcategories
      registrationStats.forEach((rs) => {
        if (rs._id && !event.subcategories.includes(rs._id)) {
          const pay = paymentStats.find((p) => p._id === rs._id);
          subcategoryBreakdown.push({
            subcategory: rs._id,
            athletes: rs.count,
            revenue: pay ? pay.revenue : 0,
          });
        }
      });
    }

    const result = {
      _id: event._id,
      eventId: event.eventId,
      eventName: event.eventName,
      haveSubcategory: event.haveSubcategory,
      subcategories: event.subcategories || [],
      totalAthletes,
      totalRevenue,
      subcategoryBreakdown: subcategoryBreakdown.length > 0 ? subcategoryBreakdown : undefined,
    };

    return res
      .status(200)
      .json(
        new CommonResponse(200, "Single event statistics fetched successfully", result),
      );
  } catch (error) {
    console.error("Get single event statistics error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

module.exports = {
  getStats,
  getTotalPaymentsReceived,
  getEventStats,
  getSingleEventStats,
};
