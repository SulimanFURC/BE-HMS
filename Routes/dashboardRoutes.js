const express = require("express")
const router = express.Router();
const {getDashboardData, getMonthlyChartData} = require("../controllers/dashboardController");
const { validateToken } = require("../middleware/validateTokenHandler");

router.use(validateToken);
// Get all Dashboard Data
router.route("/getDashboardData").get(getDashboardData)
router.route("/getDashboardChart").get(getMonthlyChartData)


module.exports = router;
