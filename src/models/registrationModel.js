const mongoose = require("mongoose");

const atheleteRegistrationSchema = require("../schema/registrationSchema");

const registrationModel = mongoose.model("Registration", atheleteRegistrationSchema);

module.exports = registrationModel;
