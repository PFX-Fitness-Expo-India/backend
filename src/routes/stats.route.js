const express = require("express");
const { getStats, getTotalPaymentsReceived, getEventStats } = require("../controllers/stats.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const router = express.Router();

/**
 * @route GET /api/stats
 * @desc Get Expo Statistics
 * @access Public
 */
router.get("/", getStats);

/**
 * @route GET /api/stats/revenue
 * @desc Get Total Payments Received
 * @access Private (Admin only)
 */
router.get("/revenue", authenticate, authorize("admin"), getTotalPaymentsReceived);

/**
 * @route GET /api/stats/events
 * @desc Get Detailed Stats per Event
 * @access Private (Admin only)
 */
router.get("/events", authenticate, authorize("admin"), getEventStats);

module.exports = router;
