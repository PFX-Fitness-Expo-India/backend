const express = require("express");
const { getStats, getTotalPaymentsReceived, getEventStats, getSingleEventStats } = require("../controllers/stats.controller");
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

/**
 * @route GET /api/stats/events/:id
 * @desc Get Detailed Stats for a Specific Event
 * @access Private (Admin only)
 */
router.get("/events/:id", authenticate, authorize("admin"), getSingleEventStats);

module.exports = router;
