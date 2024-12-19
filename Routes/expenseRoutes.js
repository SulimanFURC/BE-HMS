const express = require("express")
const router = express.Router();
const {getExpenses, getExpense, createExpense, updateExpense, deleteExpense, expensesByDateRange} = require("../controllers/expenseController");
const { validateToken } = require("../middleware/validateTokenHandler");
const uploadImage = require("../config/multer");

router.use(validateToken);

// Get all Expenses
router.route("/getAllExpenses").get(getExpenses)

// Get Expense by id
router.route("/getExpenseById").post(getExpense)

// Create Expense
router.route("/createExpense").post(uploadImage, createExpense)

// Update Expense by id
router.route("/updateExpense").put(updateExpense)

// Delete Expense by id
router.route("/deleteExpense").delete(deleteExpense)

// Delete Expense by id
router.route("/expenseByDateRange").post(expensesByDateRange)


module.exports = router;
