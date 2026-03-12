const mongoose = require("mongoose");

const visitorSchema = require("../schema/visitorSchema");

const visitorModel = mongoose.model("Visitor", visitorSchema);

module.exports = visitorModel;
