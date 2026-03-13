const express = require("express");
const {
  createRegistration,
  getRegistrations,
  getRegistrationById,
  updateRegistrationStatus,
  deleteRegistration,
} = require("../controllers/athlete.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/", authenticate, createRegistration);
router.get("/", authenticate, authorize("admin"), getRegistrations);
router.get("/:id", authenticate, getRegistrationById);
router.put("/:id/status", authenticate, authorize("admin"), updateRegistrationStatus);
router.delete("/:id", authenticate, authorize("admin"), deleteRegistration);

module.exports = router;
