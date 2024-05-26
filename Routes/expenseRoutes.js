const express = require("express")
const router = express.Router();
const {getExpenses, getExpense, createExpense, updateExpense, deleteExpense} = require("../controllers/expenseController")

// Get all Expenses
router.route("/").get(getExpenses)

// Get Expense by id
router.route("/:id").get(getExpense)

// Create Expense
router.route("/").post(createExpense)

// Update Expense by id
router.route("/:id").put(updateExpense)

// Delete Expense by id
router.route("/:id").delete(deleteExpense)


module.exports = router;
