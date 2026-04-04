const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticket.controller");
const { authenticate } = require("../middlewares/auth.middleware");

router.get("/", authenticate, ticketController.getTickets);
router.get("/my-tickets", authenticate, ticketController.getMyTickets);
router.get("/:id", authenticate, ticketController.getTicketById);
router.get("/user/:userId", authenticate, ticketController.getTicketsByUserId);
router.put("/:ticketId/status", authenticate, ticketController.updateTicketStatus);

module.exports = router;
