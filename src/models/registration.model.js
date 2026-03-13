const mongoose = require("mongoose");

const athleteRegistrationSchema = require("../schema/athlete.schema");

const registrationModel = mongoose.model("Registration", athleteRegistrationSchema);

module.exports = registrationModel;
