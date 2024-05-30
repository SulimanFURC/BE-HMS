const express = require("express")
const router = express.Router();
const {getExpenses, getExpense, createExpense, updateExpense, deleteExpense} = require("../controllers/expenseController");
const { validateToken } = require("../middleware/validateTokenHandler");

// Get all Expenses
router.route("/getAllExpenses").get(validateToken, getExpenses)

// Get Expense by id
router.route("/getExpenseById/:id").get(validateToken, getExpense)

// Create Expense
router.route("/createExpense").post(validateToken, createExpense)

// Update Expense by id
router.route("/updateExpense/:id").put(validateToken, updateExpense)

// Delete Expense by id
router.route("/deleteExpense/:id").delete(validateToken, deleteExpense)


module.exports = router;
