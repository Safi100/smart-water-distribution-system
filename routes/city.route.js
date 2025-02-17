const express = require("express");
const { addCity, getCities } = require("../controllers/city.controller");

const router = express.Router({ mergeParams: true });

const { isLoggedIn, isManagerOrAbove } = require("../middleware");

// get cities
router.get("/", isLoggedIn, isManagerOrAbove, getCities);
// add city
router.post("/", isLoggedIn, isManagerOrAbove, addCity);

module.exports = router;
