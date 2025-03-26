const express = require("express");
const {
  addTank,
  tankProfile,
  getTanks,
} = require("../controllers/tank.controller");

const router = express.Router({ mergeParams: true });

const { isLoggedIn, isManagerOrAbove } = require("../middleware");

// add new tank
router.post("/", isLoggedIn, isManagerOrAbove, addTank);
// get tanks
router.get("/customer-tanks", isLoggedIn, getTanks);
// get tank by id
router.get("/:id", isLoggedIn, isManagerOrAbove, tankProfile);

module.exports = router;
