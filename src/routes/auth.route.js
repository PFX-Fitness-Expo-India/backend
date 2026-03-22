const express = require("express");
const {
  login,
  signup,
  refreshAccessToken,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
  getUserInfo,
} = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const router = express.Router();

router.post("/login", login);
router.post("/signup", signup);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", authenticate, logout);
router.post("/change-password", authenticate, changePassword);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:token", resetPassword);

router.get("/profile", authenticate, (req, res) => {
  res.status(200).json({
    message: "Profile data fetched successfully",
    user: req.user,
  });
});

router.get("/getUser/:id", authenticate, getUserInfo);

module.exports = router;
