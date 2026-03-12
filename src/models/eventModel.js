const mongoose = require("mongoose");

const eventSchema = require("../schema/eventSchema");

const eventModel = mongoose.model("Event", eventSchema);

module.exports = eventModel;
