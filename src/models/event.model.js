const mongoose = require("mongoose");

const eventSchema = require("../schema/event.schema");

const eventModel = mongoose.model("Event", eventSchema);

module.exports = eventModel;
