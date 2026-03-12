const mongoose = require("mongoose");
const paymentSchema = require("../schema/payment.schema");

const paymentModel = mongoose.model("Payment", paymentSchema);

module.exports = paymentModel;
