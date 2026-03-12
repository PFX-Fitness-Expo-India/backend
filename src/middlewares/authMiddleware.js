const jwt = require("jsonwebtoken");
const CommonResponse = require("../utils/commonResponse");

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json(new CommonResponse(401, "No token provided", null));
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res
      .status(401)
      .json(new CommonResponse(401, "Invalid or expired token", null));
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json(
          new CommonResponse(
            403,
            "You do not have permission to perform this action",
            null
          )
        );
    }
    next();
  };
};

module.exports = { authenticate, authorize };
