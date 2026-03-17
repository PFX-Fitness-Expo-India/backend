const express = require("express");
const {
  createPayment,
  getPayments,
  getPaymentById,
  updatePaymentStatus,
} = require("../controllers/payment.controller");
const {
  createOrder,
  verifyPayment,
} = require("../controllers/razorpay.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/", authenticate, createPayment);
router.post("/create-order", authenticate, createOrder);
router.post("/verify-payment", authenticate, verifyPayment);
router.get("/", authenticate, authorize("admin"), getPayments);
router.get("/:id", authenticate, getPaymentById);
router.put("/:id/status", authenticate, authorize("admin"), updatePaymentStatus);

module.exports = router;
