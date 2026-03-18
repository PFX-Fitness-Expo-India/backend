const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticket.controller");
// Assuming authMiddleware is available in src/middlewares/auth.middleware.js
// I'll check first or just use it if I'm sure.
// Let's list middlewares to be sure.

router.get("/", ticketController.getTickets);
router.get("/:id", ticketController.getTicketById);
router.get("/user/:userId", ticketController.getTicketsByUserId);
router.put("/:id/status", ticketController.updateTicketStatus);

module.exports = router;
