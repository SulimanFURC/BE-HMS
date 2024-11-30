const express = require("express")
const router = express.Router();
const {getDashboardData} = require("../controllers/dashboardController");
const { validateToken } = require("../middleware/validateTokenHandler");

router.use(validateToken);
// Get all Dashboard Data
router.route("/getDashboardData").get(getDashboardData)


module.exports = router;
