const express = require("express");
const { login, signup } = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const router = express.Router();

router.post("/login", login);
router.post("/signup", signup);

router.get("/profile", authenticate, (req, res) => {
  res.status(200).json({
    message: "Profile data fetched successfully",
    user: req.user,
  });
});

module.exports = router;
