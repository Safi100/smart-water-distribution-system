const express = require("express");
const { addCustomer } = require("../controllers/customer.controller");
const router = express.Router({ mergeParams: true });

router.post("/", addCustomer);

module.exports = router;
