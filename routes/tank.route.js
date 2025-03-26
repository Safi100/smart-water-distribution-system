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
// get tank by id
router.get("/:id", isLoggedIn, isManagerOrAbove, tankProfile);
// get tank by id
router.get("/customer-tanks", isLoggedIn, getTanks);

module.exports = router;
