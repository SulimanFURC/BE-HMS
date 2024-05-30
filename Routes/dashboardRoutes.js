const express = require("express")
const router = express.Router();
const {getDashboardData} = require("../controllers/dashboardController");
const { validateToken } = require("../middleware/validateTokenHandler");

// Get all Dashboard Data
router.route("/").get(validateToken, getDashboardData)


module.exports = router;
