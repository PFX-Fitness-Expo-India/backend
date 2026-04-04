const express = require("express");
const {
  submitInquiry,
  getInquiries,
  deleteInquiry,
} = require("../controllers/contact.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const router = express.Router();

// Public route to submit an inquiry
router.post("/", submitInquiry);

// Admin only routes
router.get("/", authenticate, authorize("admin"), getInquiries);
router.delete("/:id", authenticate, authorize("admin"), deleteInquiry);

module.exports = router;
