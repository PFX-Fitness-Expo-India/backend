const mongoose = require("mongoose");
const ticketSchema = require("../schema/ticket.schema");

const ticketModel = mongoose.model("Ticket", ticketSchema);

module.exports = ticketModel;
