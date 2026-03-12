const express = require("express");
const { login, signup } = require("../controllers/authController");
const { authenticate } = require("../middlewares/authMiddleware");
const router = express.Router();

router.post("/login", login);
router.post("/signup", signup);

// Protected route example
router.get("/profile", authenticate, (req, res) => {
  res.status(200).json({
    message: "Profile data fetched successfully",
    user: req.user,
  });
});

module.exports = router;
