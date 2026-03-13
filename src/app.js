require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db.config");
const authRoutes = require("./routes/auth.route");
const eventRoutes = require("./routes/event.route");
const athleteRoutes = require("./routes/athlete.route");
const visitorRoutes = require("./routes/visitor.route");
const paymentRoutes = require("./routes/payment.route");

connectDB();

const app = express();

app.use(helmet());
app.use(cors());

app.use(morgan("dev"));

app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
});
app.use("/api/", limiter);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/athletes", athleteRoutes);
app.use("/api/visitors", visitorRoutes);
app.use("/api/payments", paymentRoutes);
app.get("/", (req, res) => {
  res.send("API is running");
});

module.exports = app;