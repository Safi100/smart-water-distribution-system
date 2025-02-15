const express = require("express");
const { generalSearch } = require("../controllers/index.controller");

const router = express.Router({ mergeParams: true });

const { isLoggedIn, isManagerOrAbove } = require("../middleware");

// general search
router.get("/search", isLoggedIn, isManagerOrAbove, generalSearch);

module.exports = router;
