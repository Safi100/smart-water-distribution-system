const express = require("express");
const {
  addCustomer,
  getCustomers,
  getCustomerById,
} = require("../controllers/customer.controller");

const router = express.Router({ mergeParams: true });

const { isLoggedIn, isManagerOrAbove } = require("../middleware");

// get all customers
router.get("/", isLoggedIn, isManagerOrAbove, getCustomers);
// add a new customer
router.post("/", isLoggedIn, isManagerOrAbove, addCustomer);
// get customer by id
router.get("/:id", isLoggedIn, isManagerOrAbove, getCustomerById);

module.exports = router;
