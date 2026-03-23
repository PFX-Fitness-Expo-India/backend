const express = require("express");
const { getUsers } = require("../controllers/user.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const router = express.Router();

/**
 * @route GET /api/users
 * @desc Get all users with optional role filtering
 * @access Private/Admin
 */
router.get("/", authenticate, authorize("admin"), getUsers);

module.exports = router;
