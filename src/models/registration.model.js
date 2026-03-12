const mongoose = require("mongoose");

const atheleteRegistrationSchema = require("../schema/registration.schema");

const registrationModel = mongoose.model("Registration", atheleteRegistrationSchema);

module.exports = registrationModel;
