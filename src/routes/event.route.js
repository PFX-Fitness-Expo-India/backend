const express = require("express");
const {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  updateEventActiveStatus,
  getEventParticipants,
  getEventSchedule,
} = require("../controllers/event.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", getEvents);
router.get("/schedule", getEventSchedule);
router.get("/:id", getEventById);
router.post("/", authenticate, authorize("admin"), createEvent);
router.put("/:id", authenticate, authorize("admin"), updateEvent);
router.delete("/:id", authenticate, authorize("admin"), deleteEvent);
router.put(
  "/active/:id",
  authenticate,
  authorize("admin"),
  updateEventActiveStatus,
);

router.get("/:id/participants", authenticate, authorize("admin"), getEventParticipants);

module.exports = router;
