const asyncHandler = require("express-async-handler");
const db = require("../config/dbConnection");
const path = require('path');
const fs = require("fs")
const { uploadOnCloudinary } = require("../config/cloudinary");

// Middleware to handle image uploads
// const uploadImage = upload.single('expAttachment');

//@desc    Get all expenses
//@route   GET /api/expense
//@access  Private
const getExpenses = asyncHandler(async (req, res) => {
    try {
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;
        const limit = pageSize;

        // Search and filter
        const { search, startDate, endDate } = req.query;
        let whereClauses = [];
        let params = [];

        // Search by expense ID or expense name
        if (search) {
            if (!isNaN(search)) {
                whereClauses.push('expID = ?');
                params.push(Number(search));
            } else {
                whereClauses.push('expName LIKE ?');
                params.push(`%${search}%`);
            }
        }

        // Filter by date range
        if (startDate && endDate) {
            whereClauses.push('expDate BETWEEN ? AND ?');
            params.push(startDate, endDate);
        } else if (startDate) {
            whereClauses.push('expDate >= ?');
            params.push(startDate);
        } else if (endDate) {
            whereClauses.push('expDate <= ?');
            params.push(endDate);
        }

        const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Get total number of records
        const [totalRowsResult] = await db.query(
            `SELECT COUNT(*) AS total FROM tbl_expense ${whereSQL}`,
            params
        );
        const totalRecords = totalRowsResult[0].total;

        // Fetch paginated records
        const [rows] = await db.query(
            `SELECT * FROM tbl_expense ${whereSQL} ORDER BY expDate DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        // Calculate total pages
        const totalPages = Math.ceil(totalRecords / pageSize);

        res.status(200).json({
            data: rows,
            statusCode: 200,
            totalRecords,
            totalPages,
            currentPage: page,
            pageSize,
        });
    } catch (err) {
        res.status(500).json({ statusCode: 500, message: err.message });
    }
});

//@desc    Get single expense by ID
//@route   POST /api/expense
//@access  Private
const getExpense = asyncHandler(async (req, res) => {
    const { expenseId } = req.body;

    try {
        // Validate input
        if (!expenseId) {
            return res.status(400).json({ message: 'Expense ID is required' });
        }

        // Fetch student record
        const [rows] = await db.query('SELECT * FROM tbl_expense WHERE expID = ?', [expenseId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        const expense = rows[0];

        // No need to convert paths since URLs are directly stored from Cloudinary
        res.status(200).json(expense);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
})

//@desc    Create a new expense
//@route   POST /api/expense
//@access  Private
const createExpense = asyncHandler(async (req, res)=> {
    const { expDate, expName, expAmount, expPaymentMode, description, expAttachment } = req.body;

    try {
        // Validate required fields
        if (!expDate || !expName || !expAmount) {
            res.status(400).json({ message: 'All fields are required' });
            return;
        }

        // Insert student data into the database
        const [result] = await db.query(
            "INSERT INTO tbl_expense (expDate, expName, expAmount, expPaymentMode, description, expAttachment) VALUES (?, ?, ?, ?, ?, ?)",
            [expDate, expName, expAmount, expPaymentMode, description, expAttachment]
        );

        const expenseID = result.insertId; // Get the Expense ID

        // Upload images to Cloudinary
        const pictureUrl = expAttachment ? await uploadOnCloudinary(expAttachment, `Expenses/Expense-${expenseID}`, `expense-${Date.now()}.jpg`) : null;

        // Update database with Cloudinary URLs
        await db.query(`UPDATE tbl_expense SET expAttachment = ? WHERE expID = ?`, [pictureUrl, expenseID]);

        // Return success response
        res.status(201).json({ message: 'Expense created', expenseID, status: 201 });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
})

//@desc    Update an expense
//@route   PUT /api/expense
//@access  Private
const updateExpense = asyncHandler(async (req, res) => {
    const {expenseID, expDate, expName, expAmount, expPaymentMode, description, expAttachment } = req.body;
    try {
        // Validate required fields
        if (!expenseID) {
            return res.status(400).json({ message: 'Expense ID is required' });
        }

        // Fetch existing student record
        const [rows] = await db.query('SELECT * FROM tbl_expense WHERE expID = ?', [expenseID]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Record Not Found' });
        }
        const existingRecord = rows[0]; // Existing student record

        // Upload new images if provided, or retain existing ones
        const updatedExpensePictureUrl = expAttachment ? await uploadOnCloudinary(expAttachment, `Expenses/Expense-${expenseID}`, `expense-${Date.now()}.jpg`) : existingRecord.expAttachment;
        // Update student record with provided or existing values
        await db.query(
            `UPDATE tbl_expense 
            SET 
               expDate = ?, 
               expName = ?, 
               expAmount = ?, 
               expPaymentMode = ?, 
               description = ?, 
               expAttachment = ? 
            WHERE expID = ?`,
            [
                expDate || existingRecord.expDate,
                expName || existingRecord.expName,
                expAmount || existingRecord.expAmount,
                expPaymentMode || existingRecord.expPaymentMode,
                description || existingRecord.description,
                updatedExpensePictureUrl,
                expenseID
            ]
        );

        // Success response
        res.status(200).json({ message: 'Record updated', ExpenseID: expenseID, status: 200});
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

//@desc    Delete an expense
//@route   DELETE /api/expense
//@access  Private
const deleteExpense = asyncHandler(async (req, res) => {
    const { expID: expenseID } = req.body; // Extract the Expense ID from the request body

    try {
        // Validate that the ID is provided
        if (!expenseID) {
            return res.status(400).json({ message: 'Expense ID is required' });
        }

        // Check if the student exists
        const [rows] = await db.query('SELECT * FROM tbl_expense WHERE expID = ?', [expenseID]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Record not found' });
        }

        // Delete associated image files if they exist
        if (rows[0].expAttachment) {
            try {
                fs.unlinkSync(rows[0].expAttachment);
            } catch (err) {
                console.error('Error deleting picture file:', err.message);
            }
        }
        // Delete the student record
        await db.query('DELETE FROM tbl_expense WHERE expID = ?', [expenseID]);

        res.status(200).json({ message: 'Record deleted successfully', expenseID });
    } catch (err) {
        console.error('Error deleting Expense record:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
})

//@desc    Get expenses by date range
//@route   POST /api/expense/dateRange
//@access  Private
const expensesByDateRange = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.body;

    try {
        // Validate input
        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Start date and end date are required' });
        }

        // Fetch total income and expenses within the date range
        const [expenseResult] = await db.query(
            'SELECT SUM(expAmount) AS totalExpense FROM tbl_expense WHERE expDate BETWEEN ? AND ? AND expAmount > 0',
            [startDate, endDate]
        );

        console.log("Start Year: ", new Date(startDate).getFullYear())
        console.log("Start Month: ", new Date(startDate).getMonth() + 1)
        console.log("End Year: ", new Date(endDate).getFullYear())
        console.log("End Month: ", new Date(endDate).getMonth() + 1)
        const [incomeResult] = await db.query(
            'SELECT SUM(PaidAmount) AS totalIncome FROM tbl_rent WHERE (Year > ? OR (Year = ? AND RentPaidMonth >= ?)) AND (Year < ? OR (Year = ? AND RentPaidMonth <= ?))',
            [
            new Date(startDate).getFullYear(),
            new Date(startDate).getFullYear(),
            new Date(startDate).getMonth() + 1,
            new Date(endDate).getFullYear(),
            new Date(endDate).getFullYear(),
            new Date(endDate).getMonth() + 1
            ]
        );
        // const [incomeResult] = await db.query(
        //     'SELECT SUM(expAmount) AS totalIncome FROM tbl_expense WHERE expDate BETWEEN ? AND ? AND expAmount < 0',
        //     [startDate, endDate]
        // );

        const totalIncome = incomeResult[0].totalIncome || 0;
        const totalExpense = expenseResult[0].totalExpense || 0;

        res.status(200).json({
            totalIncome,
            totalExpense,
            statusCode: 200
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
})

//@desc    Get financial summary
//@route   GET /api/financial-summary
//@access  Private
const getFinancialSummary = asyncHandler(async (req, res) => {
    try {
        const now = new Date();
        const formatDate = (date) => date.toISOString().slice(0, 10);
        // Always use current month
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const startYear = firstDay.getFullYear();
        const startMonth = firstDay.getMonth() + 1;
        const endYear = lastDay.getFullYear();
        const endMonth = lastDay.getMonth() + 1;
        const startDate = formatDate(firstDay);
        const endDate = formatDate(lastDay);

        // Helper for rent WHERE clause (no RentStatus filter)
        const rentWhere = `((Year > ? OR (Year = ? AND RentPaidMonth >= ?)) AND (Year < ? OR (Year = ? AND RentPaidMonth <= ?)))`;
        const rentParams = [startYear, startYear, startMonth, endYear, endYear, endMonth];

        // Total Income (PaidAmount from tbl_rent, all statuses)
        const [incomeResult] = await db.query(
            `SELECT SUM(PaidAmount) AS totalIncome FROM tbl_rent WHERE ${rentWhere}`,
            rentParams
        );
        const totalIncome = incomeResult[0].totalIncome || 0;

        // Total Expense (expAmount from tbl_expense)
        const [expenseResult] = await db.query(
            'SELECT SUM(expAmount) AS totalExpense FROM tbl_expense WHERE expDate BETWEEN ? AND ?',
            [startDate, endDate]
        );
        const totalExpense = expenseResult[0].totalExpense || 0;

        // Total Dues (Dues from tbl_rent)
        const [duesResult] = await db.query(
            `SELECT SUM(Dues) AS totalDues FROM tbl_rent WHERE ${rentWhere}`,
            rentParams
        );
        const totalDues = duesResult[0].totalDues || 0;

        // Profit/Loss for the range
        const profitOrLoss = totalIncome - totalExpense;
        let profitOrLossLabel = 'Break-even';
        if (profitOrLoss > 0) profitOrLossLabel = 'Profit';
        else if (profitOrLoss < 0) profitOrLossLabel = 'Loss';

        res.status(200).json({
            totalIncome,
            totalExpense,
            totalDues,
            profitOrLoss,
            profitOrLossLabel,
            statusCode: 200
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = {getExpenses, getExpense, createExpense, updateExpense, deleteExpense, expensesByDateRange, getFinancialSummary}