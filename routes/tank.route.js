const express = require("express");
const {
  addTank,
  tankProfile,
  getTanks,
  ProfileTankForCustomer,
} = require("../controllers/tank.controller");

const router = express.Router({ mergeParams: true });

const { isLoggedIn, isManagerOrAbove } = require("../middleware");

// add new tank
router.post("/", isLoggedIn, isManagerOrAbove, addTank);
// get tanks - for customer
router.get("/customer-tanks", isLoggedIn, getTanks);
// get tank by id
router.get("/:id", isLoggedIn, isManagerOrAbove, tankProfile);
// get tank profile - for customer
router.get("/customer-tank/:id", isLoggedIn, ProfileTankForCustomer);

module.exports = router;
