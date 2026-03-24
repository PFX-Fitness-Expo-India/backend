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

app.use(helmet());
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : [];

    if (
      !origin ||
      allowedOrigins.includes("*") ||
      allowedOrigins.length === 0 ||
      allowedOrigins.includes(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

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
