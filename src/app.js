const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db.config");
const eventRoutes = require("./routes/event.route");
const athleteRoutes = require("./routes/athlete.route");
const visitorRoutes = require("./routes/visitor.route");
const paymentRoutes = require("./routes/payment.route");

const authRoutes = require("./routes/auth.route");
const ticketRoutes = require("./routes/ticket.route");
const userRoutes = require("./routes/user.route");
const statsRoutes = require("./routes/stats.route");
const sendEmail = require("./utils/email.util");


connectDB();

const app = express();

// Simplified CORS for Vercel/Production stability
const allowedOrigins = process.env.ALLOWED_ORIGINS === "*" 
  ? true 
  : (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : true);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  optionsSuccessStatus: 200 
}));

app.use(helmet({
  crossOriginResourcePolicy: false,
}));

app.use(morgan("dev"));

app.use(compression());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use("/api", limiter);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/athletes", athleteRoutes);

app.use("/api/visitors", visitorRoutes);
app.use("/api/users", userRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/tickets", ticketRoutes);

app.get("/test-email", async (req, res) => {
  try {
    await sendEmail({
      email: "717822f253@kce.ac.in",
      subject: "Test Email",
      message: "Test successful",
    });

    res.send("Email sent successfully");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/", (req, res) => {
  console.log("Root route hit!");
  res.send(`API is running on port ${process.env.PORT || 3000}`);
});


module.exports = app;
