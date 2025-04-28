const express = require("express");
const {
  getAllBills,
  getMyBills,
  getBillProfile,
  getMyBillProfile,
  payBill,
  payBillByAdmin,
  successPayment,
} = require("../controllers/bill.controller");

const router = express.Router({ mergeParams: true });

const { isLoggedIn, isManagerOrAbove } = require("../middleware");

// get all bills
router.get("/", isLoggedIn, isManagerOrAbove, getAllBills);
// get all bills for current customer
router.get("/my-bills", isLoggedIn, getMyBills);
// get all bills for current customer
router.get("/my-bills/:id", isLoggedIn, getMyBillProfile);
// get bill profile
router.get("/:id", isLoggedIn, isManagerOrAbove, getBillProfile);
// pay bill
router.post("/:id/pay", isLoggedIn, payBill);
// pay bill by admin
router.post("/:id/pay-admin", isLoggedIn, isManagerOrAbove, payBillByAdmin);
// update bill status after payment
router.put("/:id/payment-success", isLoggedIn, successPayment);

module.exports = router;
