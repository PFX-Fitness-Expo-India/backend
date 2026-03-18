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

connectDB();

const app = express();

app.use(helmet());
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : "*",
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
app.use("/api/payments", paymentRoutes);
app.use("/api/tickets", ticketRoutes);

app.get("/", (req, res) => {
  console.log("Root route hit!");
  res.send("API is running on port 3001");
});


module.exports = app;
