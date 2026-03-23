const express = require("express");
const { getStats } = require("../controllers/stats.controller");

const router = express.Router();

/**
 * @route GET /api/stats
 * @desc Get Expo Statistics
 * @access Public
 */
router.get("/", getStats);

module.exports = router;
