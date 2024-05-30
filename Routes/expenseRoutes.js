const express = require("express")
const router = express.Router();
const {getExpenses, getExpense, createExpense, updateExpense, deleteExpense} = require("../controllers/expenseController");
const { validateToken } = require("../middleware/validateTokenHandler");

// Get all Expenses
router.route("/").get(validateToken, getExpenses)

// Get Expense by id
router.route("/:id").get(validateToken, getExpense)

// Create Expense
router.route("/").post(validateToken, createExpense)

// Update Expense by id
router.route("/:id").put(validateToken, updateExpense)

// Delete Expense by id
router.route("/:id").delete(validateToken, deleteExpense)


module.exports = router;
