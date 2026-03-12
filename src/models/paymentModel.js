const mongoose = require("mongoose");
const paymentSchema = require("../schema/paymentSchema");

const paymentModel = mongoose.model("Payment", paymentSchema);

module.exports = paymentModel;
