const express = require("express");
const {
  generalSearch,
  dashboard_data,
  pumpWater,
} = require("../controllers/index.controller");

const router = express.Router({ mergeParams: true });

const { isLoggedIn, isManagerOrAbove } = require("../middleware");

// dashboard data
router.get("/dashboard", isLoggedIn, isManagerOrAbove, dashboard_data);
// general search
router.get("/search", isLoggedIn, isManagerOrAbove, generalSearch);
// pump water
router.post("/pump-water", isLoggedIn, isManagerOrAbove, pumpWater);

// other routes...
module.exports = router;
