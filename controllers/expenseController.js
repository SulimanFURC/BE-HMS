const asyncHandler = require("express-async-handler");
const db = require("../config/dbConnection");
const upload = require('../config/multer');
const path = require('path');
const fs = require("fs")

// Middleware to handle image uploads
const uploadImage = upload.single('expAttachment');

//@decs Get all expenses
//@route GET /api/expense
//@access Public
const getExpenses = asyncHandler(async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM tbl_expense');
        rows.forEach(expense => {
            if (expense.expAttachment) {
                expense.expAttachment = `${req.protocol}://${req.get('host')}/uploads/${path.basename(expense.expAttachment)}`;
            }
        });
        res.status(200).json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
})

//@decs Get Single expense
//@route GET /api/expense
//@access Public
const getExpense = asyncHandler(async (req, res) => {
    const expenseId = req.params.id;
    try {
        const [rows] = await db.query('SELECT * FROM tbl_expense WHERE expID = ?', [expenseId]);
        if (rows.length === 0) {
            res.status(404).json({ message: 'Record not found' });
            return;
        }

        const expense = rows[0];
        if (expense.expAttachment) {
            expense.expAttachment = `${req.protocol}://${req.get('host')}/uploads/${path.basename(expense.expAttachment)}`;
        }

        res.status(200).json(expense);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
})

//@decs Create expense
//@route GET /api/expense
//@access Public
const createExpense = asyncHandler(async (req, res)=> {
    uploadImage(req, res, async (err) => {
        if (err) {
            res.status(400).json({ message: err.message });
            return;
        }

        const { expDate, expName, expAmount, expPaymentMode, description } = req.body;
        const expAttachment = req.file ? req.file.path : null; // File path or null if no file uploaded

        try {
            const [result] = await db.query(
                "INSERT INTO tbl_expense (expDate, expName, expAmount, expPaymentMode, description, expAttachment) VALUES (?, ?, ?, ?, ?, ?)",
                [expDate, expName, expAmount, expPaymentMode, description, expAttachment]
            );
            res.status(201).json({ message: 'Expense created', expenseID: result.insertId });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    });
})

//@decs Update expense
//@route GET /api/expense
//@access Public
const updateExpense = asyncHandler(async (req, res) => {
    uploadImage(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }

        const expenseId = req.params.id;
        const { expDate, expName, expAmount, expPaymentMode, description } = req.body;
        const expAttachment = req.file ? req.file.path : null;

        try {
            // Check if the expense exists
            const [rows] = await db.query('SELECT * FROM tbl_expense WHERE expID = ?', [expenseId]);
            if (rows.length === 0) {
                return res.status(404).json({ message: "Record Not Found" });
            }

            // If a new attachment is uploaded, delete the old one
            if (expAttachment && rows[0].expAttachment) {
                fs.unlinkSync(rows[0].expAttachment);
            }

            // Update the expense record
            await db.query(
                `UPDATE tbl_expense 
                SET expDate = ?, expName = ?, expAmount = ?, expPaymentMode = ?, description = ?, expAttachment = ? 
                WHERE expID = ?`,
                [expDate, expName, expAmount, expPaymentMode, description, expAttachment || rows[0].expAttachment, expenseId]
            );

            return res.status(200).json({ message: 'Record updated', expenseId: expenseId });
        } catch (err) {
            return res.status(500).json({ message: err.message });
        }
    });
});

//@decs Delete Expense
//@route GET /api/expense
//@access Public
const deleteExpense = asyncHandler(async (req, res) => {
    const expenseId = req.params.id
    try{
        const [rows] = await db.query("SELECT * FROM tbl_expense WHERE expID = ?", [expenseId]);
        if(rows.length === 0) {
            res.status(404).json({message: "Record Not Found"})
        }

        if (rows[0].expAttachment) {
            const filePath = path.join(__dirname, '..', rows[0].expAttachment);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            } else {
                console.warn(`File not found: ${filePath}`);
            }
        }
        await db.query("DELETE FROM tbl_expense WHERE expID = ?", [expenseId]);
        res.status(200).json({message: `Expense No: ${req.params.id} is deleted successfully`})
    } catch(err){
        res.status(500).json({message: err})
    }
})

module.exports = {getExpenses, getExpense, createExpense, updateExpense, deleteExpense}