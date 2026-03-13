const paymentModel = require("../models/payment.model");
const CommonResponse = require("../utils/common.response");

const createPayment = async (req, res) => {
  try {
    const { userId, eventId, amount, paymentMethod, transactionId } = req.body;

    const payment = new paymentModel({
      userId,
      eventId,
      amount,
      paymentMethod,
      transactionId,
      paymentStatus: "pending",
    });

    await payment.save();

    return res
      .status(201)
      .json(new CommonResponse(201, "Payment initiated successfully", payment));
  } catch (error) {
    console.error("Create payment error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const getPayments = async (req, res) => {
  try {
    const payments = await paymentModel.find()
      .populate("userId", "userName email")
      .populate("eventId", "eventName");
    return res
      .status(200)
      .json(new CommonResponse(200, "Payments fetched successfully", payments));
  } catch (error) {
    console.error("Get payments error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await paymentModel.findById(id)
      .populate("userId", "userName email")
      .populate("eventId", "eventName");

    if (!payment) {
      return res
        .status(404)
        .json(new CommonResponse(404, "Payment not found", null));
    }

    return res
      .status(200)
      .json(new CommonResponse(200, "Payment fetched successfully", payment));
  } catch (error) {
    console.error("Get payment by id error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    const payment = await paymentModel.findByIdAndUpdate(
      id,
      { paymentStatus, updatedAt: Date.now() },
      { new: true }
    );

    if (!payment) {
      return res
        .status(404)
        .json(new CommonResponse(404, "Payment not found", null));
    }

    return res
      .status(200)
      .json(new CommonResponse(200, "Payment status updated successfully", payment));
  } catch (error) {
    console.error("Update payment status error:", error);
    return res
      .status(500)
      .json(new CommonResponse(500, "Internal server error", null));
  }
};

module.exports = {
  createPayment,
  getPayments,
  getPaymentById,
  updatePaymentStatus,
};
