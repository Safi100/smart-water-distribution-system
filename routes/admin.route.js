const express = require("express");
const { addAdmin } = require("../controllers/admin.controller");
const router = express.Router({ mergeParams: true });

router.post("/", addAdmin);

module.exports = router;
