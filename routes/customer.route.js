const express = require("express");
const {
  addCustomer,
  getCustomers,
  getCustomerById,
  loginCustomer,
  forgotPassword,
  updateCustomer,
} = require("../controllers/customer.controller");

const router = express.Router({ mergeParams: true });

const { isLoggedIn, isManagerOrAbove } = require("../middleware");

// login
router.post("/login", loginCustomer);
// forgot password
router.post("/forgot-password", forgotPassword);
// update customer data - current customer
router.put("/update-data", isLoggedIn, updateCustomer);
// get all customers
router.get("/", isLoggedIn, isManagerOrAbove, getCustomers);
// add a new customer
router.post("/", isLoggedIn, isManagerOrAbove, addCustomer);
// get customer by id
router.get("/:id", isLoggedIn, isManagerOrAbove, getCustomerById);

module.exports = router;
