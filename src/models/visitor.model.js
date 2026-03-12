const mongoose = require("mongoose");

const visitorSchema = require("../schema/visitor.schema");

const visitorModel = mongoose.model("Visitor", visitorSchema);

module.exports = visitorModel;
