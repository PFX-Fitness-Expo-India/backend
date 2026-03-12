const express = require("express");
const {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
} = require("../controllers/event.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const router = express.Router();

// Public routes
router.get("/", getEvents);
router.get("/:id", getEventById);

// Protected routes (Admin only for management)
router.post("/", authenticate, authorize("admin"), createEvent);
router.put("/:id", authenticate, authorize("admin"), updateEvent);
router.delete("/:id", authenticate, authorize("admin"), deleteEvent);

module.exports = router;
