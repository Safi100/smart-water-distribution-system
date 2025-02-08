const express = require("express");
const {
  addAdminManager,
  loginAdmin,
  removeAdminManager,
  getAdmins,
  forgotPassword,
} = require("../controllers/admin.controller");

const router = express.Router({ mergeParams: true });

const { isLoggedIn, isAdmin } = require("../middleware");

// get admins
router.get("/", isLoggedIn, isAdmin, getAdmins);
// add manager
router.post("/", isLoggedIn, isAdmin, addAdminManager);
// login
router.post("/login", loginAdmin);
// forgot password
router.post("/forgot-password", forgotPassword);
// remove manager
router.delete("/:id", isLoggedIn, isAdmin, removeAdminManager);

module.exports = router;
