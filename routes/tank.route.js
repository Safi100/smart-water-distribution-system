const express = require("express");
const { addTank, getTanksByCity } = require("../controllers/tank.controller");

const router = express.Router({ mergeParams: true });

const { isLoggedIn, isManagerOrAbove } = require("../middleware");

// add new tank
router.post("/", isLoggedIn, isManagerOrAbove, addTank);
// get tanks by city
router.get("/city/:id", isLoggedIn, isManagerOrAbove, getTanksByCity);

module.exports = router;
