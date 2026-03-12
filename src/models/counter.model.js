const mongoose = require("mongoose");
const counterSchema = require("../schema/counter.schema");

const Counter = mongoose.model("Counter", counterSchema);

module.exports = Counter;
