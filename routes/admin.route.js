const express = require("express");
const { addAdmin, loginAdmin } = require("../controllers/admin.controller");
const router = express.Router({ mergeParams: true });
const { isLoggedIn, isAdmin } = require("../middleware");

router.post("/", isLoggedIn, isAdmin, addAdmin);
router.post("/login", loginAdmin);

module.exports = router;
