const express = require("express");
const {
  createVisitor,
  getVisitors,
  getVisitorById,
  updateVisitorAttendance,
  deleteVisitor,
} = require("../controllers/visitor.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/", authenticate, createVisitor);
router.get("/", authenticate, authorize("admin"), getVisitors);
router.get("/:id", authenticate, getVisitorById);
router.put("/:id/attendance", authenticate, authorize("admin", "dev"), updateVisitorAttendance);
router.delete("/:id", authenticate, authorize("admin"), deleteVisitor);

module.exports = router;
