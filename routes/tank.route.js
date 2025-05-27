const express = require("express");
const {
  addTank,
  tankProfile,
  getTanks,
  ProfileTankForCustomer,
  fetchMainTank,
  updateTank,
  setCustomerMainTank,
  readTankValueUltraSonic,
  readMainTankValueUltraSonic,
} = require("../controllers/tank.controller");

const router = express.Router({ mergeParams: true });

const { isLoggedIn, isManagerOrAbove } = require("../middleware");

// add new tank
router.post("/", isLoggedIn, isManagerOrAbove, addTank);
// get tanks - for customer
router.get("/customer-tanks", isLoggedIn, getTanks);
// get tank by id
router.get("/:id", isLoggedIn, isManagerOrAbove, tankProfile);
// read tank value - liter - for customer
router.get("/tank-value-ultrasonic/:id", isLoggedIn, readTankValueUltraSonic);
// read main tank value - liter - for admin
router.get(
  "/main-tank-value-ultrasonic/:id",
  isLoggedIn,
  isManagerOrAbove,
  readMainTankValueUltraSonic
);
// get tank profile - for customer
router.get("/customer-tank/:id", isLoggedIn, ProfileTankForCustomer);
// set tank main - for customer
router.put("/set-main-tank/:id", isLoggedIn, setCustomerMainTank);
// get main tank
router.get("/main-tank/:id", isLoggedIn, isManagerOrAbove, fetchMainTank);
// update tank - admin/manager only
router.put("/:id", isLoggedIn, isManagerOrAbove, updateTank);

module.exports = router;
