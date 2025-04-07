const express = require("express");
const {
  getAllBills,
  getMyBills,
  getBillProfile,
  getMyBillProfile,
} = require("../controllers/bill.controller");

const router = express.Router({ mergeParams: true });

const { isLoggedIn, isManagerOrAbove } = require("../middleware");

// get all bills
router.get("/", isLoggedIn, isManagerOrAbove, getAllBills);
// get bill profile
router.get("/:id", isLoggedIn, isManagerOrAbove, getBillProfile);
// get all bills for current customer
router.get("/my-bills", isLoggedIn, getMyBills);
// get all bills for current customer
router.get("/my-bills/:id", isLoggedIn, getMyBillProfile);

module.exports = router;
