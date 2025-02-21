const express = require("express");
const {
  addCity,
  getCities,
  getCity,
} = require("../controllers/city.controller");

const router = express.Router({ mergeParams: true });

const { isLoggedIn, isManagerOrAbove } = require("../middleware");

// get cities
router.get("/", isLoggedIn, isManagerOrAbove, getCities);
// add city
router.post("/", isLoggedIn, isManagerOrAbove, addCity);
// Get city by id
router.get("/:id", isLoggedIn, isManagerOrAbove, getCity);

module.exports = router;
