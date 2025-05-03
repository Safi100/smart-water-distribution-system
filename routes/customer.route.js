const express = require("express");
const {
  addCustomer,
  getCustomers,
  getCustomerById,
  loginCustomer,
  forgotPassword,
  updateCustomer,
  changePassword,
  fetchProile,
  currentUser,
  updateAvatar,
} = require("../controllers/customer.controller");

const router = express.Router({ mergeParams: true });

const { isLoggedIn, isManagerOrAbove } = require("../middleware");

// login
router.post("/login", loginCustomer);
// forgot password
router.post("/forgot-password", forgotPassword);
// current user
router.get("/current-user", isLoggedIn, currentUser);
// upload avatar
router.put("/upload-avatar", isLoggedIn, updateAvatar);
// update customer data - current customer
router.put("/update-data", isLoggedIn, updateCustomer);
// update customer password - current customer
router.put("/update-password", isLoggedIn, changePassword);
// get all customers
router.get("/", isLoggedIn, isManagerOrAbove, getCustomers);
// add a new customer
router.post("/", isLoggedIn, isManagerOrAbove, addCustomer);
// get customer by id
router.get("/:id", isLoggedIn, isManagerOrAbove, getCustomerById);
// fetch customer profile - current customer
router.get("/:id", isLoggedIn, fetchProile);

module.exports = router;
