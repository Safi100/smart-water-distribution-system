const express = require("express");
const {
  addAdminManager,
  loginAdmin,
  removeAdminManager,
  getAdmins,
  forgotPassword,
  currentUser,
  logout,
  getAdminProfile,
  updateProfile,
  updatePassword,
} = require("../controllers/admin.controller");

const router = express.Router({ mergeParams: true });

const { isLoggedIn, isAdmin, isManagerOrAbove } = require("../middleware");

// get admins
router.get("/", isLoggedIn, isAdmin, getAdmins);
// get current user
router.get("/current-user", isLoggedIn, currentUser);
// update current user profile
router.put("/update-profile", isLoggedIn, updateProfile);
// update current user profile
router.patch("/update-password", isLoggedIn, updatePassword);
// add manager
router.post("/", isLoggedIn, isAdmin, addAdminManager);
// login
router.post("/login", loginAdmin);
// logout
router.post("/logout", logout);
// forgot password
router.post("/forgot-password", forgotPassword);
// remove manager
router.delete("/:id", isLoggedIn, isAdmin, removeAdminManager);
// get admin profile
router.get("/:id", isLoggedIn, isManagerOrAbove, getAdminProfile);

module.exports = router;
