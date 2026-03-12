const Schema = require("mongoose");


const visitorSchema = new Schema({
    visitorId: String,
    visitorName: {
        required: true,
        type: String,
    },
    phoneNumber: {
        required: true,
        type: String,
        unique: true,
    },
    email: {
        required: true,
        type: String,
        unique: true,
    },
    paymentType: {
        required: true,
        type: String,
        enum: ["success", "pending", "failed"],
    },
    ticketType:{
        required: true,
        type: String,
        enum: ["gold", "elite", "standard"],
    },
    timeStamp: {
        type: Date,
        default: Date.now,
    },
})
