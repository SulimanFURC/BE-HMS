//@decs Get all expenses
//@route GET /api/expense
//@access Public
const getExpenses = (req, res) => {
    res.status(200).json({message: "Get All Expenses"});
}

//@decs Get Single expense
//@route GET /api/expense
//@access Public
const getExpense = (req, res) => {
    res.status(200).json({message: `Get Single Expense by id: ${req.params.id}`});
}

//@decs Create expense
//@route GET /api/expense
//@access Public
const createExpense = (req, res)=> {
    res.status(200).json({message: "Create Expense"});
}

//@decs Update expense
//@route GET /api/expense
//@access Public
const updateExpense = (req, res) => {
    res.status(200).json({message: `Update Single Expense by id: ${req.params.id}`});
}

//@decs Delete Expense
//@route GET /api/expense
//@access Public
const deleteExpense = (req, res) => {
    res.status(200).json({message: `Delete Single Expense by id: ${req.params.id}`});
}

module.exports = {getExpenses, getExpense, createExpense, updateExpense, deleteExpense}