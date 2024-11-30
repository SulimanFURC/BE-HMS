const express = require("express")
const router = express.Router();
const { validateToken } = require("../middleware/validateTokenHandler");
const {getAllRentals, getRentalById, createRental, updateRental, deleteRental} = require("../controllers/rentalController");

router.use(validateToken);

// Get all Expenses
router.route("/getAllRentals").get(getAllRentals)

// Get Expense by id
router.route("/getRentalById").post(getRentalById)

// Create Expense
router.route("/createRental").post(createRental)

// Update Expense by id
router.route("/updateRental").put()

// Delete Expense by id
router.route("/deleteRental").delete()


module.exports = router;
