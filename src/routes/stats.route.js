const express = require("express");
const { getStats, getTotalPaymentsReceived } = require("../controllers/stats.controller");
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

module.exports = router;
