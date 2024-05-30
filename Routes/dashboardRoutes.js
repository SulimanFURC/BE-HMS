const express = require("express")
const router = express.Router();
const {getDashboardData} = require("../controllers/dashboardController")

// Get all Dashboard Data
router.route("/").get(getDashboardData)


module.exports = router;
