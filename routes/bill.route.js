const express = require("express");
const { getAllBills, getMyBills } = require("../controllers/bill.controller");

const router = express.Router({ mergeParams: true });

const { isLoggedIn, isManagerOrAbove } = require("../middleware");

// get all bills
router.get("/", isLoggedIn, isManagerOrAbove, getAllBills);
// get all bills for current customer
router.get("/my-bills", isLoggedIn, getMyBills);

module.exports = router;
