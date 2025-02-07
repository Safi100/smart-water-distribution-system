const jwt = require("jsonwebtoken");
const Admin = require("./models/admin.model");
const HandleError = require("./utils/HandleError");

module.exports.isLoggedIn = (req, res, next) => {
  try {
    const token = req.headers.authorization || req.cookies.access_token;
    if (!token) throw new HandleError("You must log in to access this", 401);

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) throw new HandleError("Invalid token", 401);
      req.user = decoded;
      next();
    });
  } catch (e) {
    next(e);
  }
};
module.exports.isAdmin = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.user.id);
    if (!admin || admin.role != "admin") {
      throw new HandleError(
        "You are not allowed to access this, this only for head admin",
        403
      );
    }
    next();
  } catch (e) {
    next(e);
  }
};
module.exports.isManagerOrAbove = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.user.id);
    if (!admin || (admin.role != "admin" && admin.role != "manager")) {
      throw new HandleError(
        "You are not allowed to access this, this only for admins",
        403
      );
    }
    next();
  } catch (e) {
    next(e);
  }
};
