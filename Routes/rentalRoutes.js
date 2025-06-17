const express = require("express")
const router = express.Router();
const { validateToken } = require("../middleware/validateTokenHandler");
const {getAllRentals, getRentalById, createRental, updateRental, deleteRental, studentRentDetails, generateInvoice} = require("../controllers/rentalController");

router.use(validateToken);

// Get all Expenses
router.route("/getAllRentals").get(getAllRentals)

// Get Expense by id
router.route("/getRentalById").post(getRentalById)

// Create Expense
router.route("/createRental").post(createRental)

// Update Expense by id
router.route("/updateRental").put(updateRental)

// Delete Expense by id
router.route("/deleteRental").delete(deleteRental);

// Get Rental Record for a specific User
router.route("/getStudentRentDetails").post(studentRentDetails)

// Generate Invoice for a student
router.route("/invoice").post(generateInvoice);

module.exports = router;
