const express = require("express")
const router = express.Router();
const {getExpenses, getExpense, createExpense, updateExpense, deleteExpense} = require("../controllers/expenseController");
const { validateToken } = require("../middleware/validateTokenHandler");

router.use(validateToken);

// Get all Expenses
router.route("/getAllExpenses").get(getExpenses)

// Get Expense by id
router.route("/getExpenseById/:id").get(getExpense)

// Create Expense
router.route("/createExpense").post(createExpense)

// Update Expense by id
router.route("/updateExpense/:id").put(updateExpense)

// Delete Expense by id
router.route("/deleteExpense/:id").delete(deleteExpense)


module.exports = router;
