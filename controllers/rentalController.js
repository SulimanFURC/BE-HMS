const asyncHandler = require("express-async-handler");
const db = require("../config/dbConnection");
const path = require('path');
const fs = require("fs")


//@decs Get all Rentals
//@route GET /api/rental
//@access Private
const getAllRentals = asyncHandler(async (req, res) => {
    try {
        // Default pagination values
        const page = parseInt(req.query.page) || 1; // Default to page 1
        const pageSize = parseInt(req.query.pageSize) || 10; // Default to 10 records per page

        // Calculate offset and limit
        const offset = (page - 1) * pageSize;
        const limit = pageSize;

        // Get total number of records
        const [totalRowsResult] = await db.query('SELECT COUNT(*) AS total FROM tbl_rent');
        const totalRecords = totalRowsResult[0].total;

        // Fetch paginated records
        const [rows] = await db.query('SELECT * FROM tbl_rent LIMIT ? OFFSET ?', [limit, offset]);

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
        res.status(500).json({statusCode: 500, message: err.message });
    }
})

//@decs Get Single rental
//@route POST /api/rental
//@access Private
const getRentalById= asyncHandler(async (req, res) => {
    const { rentID } = req.body; // Retrieve `studentId` from the request body
    try {
        // Validate input
        if (!rentID) {
            return res.status(400).json({ message: 'rentID ID is required' });
        }

        // Fetch student record
        const [rows] = await db.query('SELECT * FROM tbl_rent WHERE RentID = ?', [rentID]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'No Record Found', statusCode: 404 });
        }

        const rent = rows[0];

        // No need to convert paths since URLs are directly stored from Cloudinary
        res.status(200).json(rent);
    } catch (err) { 
        console.error(err);
        res.status(500).json({ message: err.message });
    }
})

//@decs Create Rent
//@route POST /api/rent
//@access Private
const createRental = asyncHandler(async (req, res)=> {
    const { stdID, RentPaidMonth, Year, RentStatus, RentType, PaidAmount } = req.body;

    if (!stdID || !RentPaidMonth || !Year || !PaidAmount) {
        res.status(400);
        throw new Error("Please provide all required fields (stdID, RentPaidMonth, Year, PaidAmount).");
    }

    try {
        // Step 1: Fetch the student's basicRent from the student table
        const [studentResult] = await db.query(
            `SELECT basicRent FROM tbl_students WHERE stdID = ?`,
            [stdID]
        );

        if (studentResult.length === 0) {
            res.status(404);
            throw new Error(`Student with ID ${stdID} not found.`);
        }

        const BasicRent = studentResult[0].basicRent;

        // Step 2: Fetch the last rent record to calculate dues
        const [lastRentResult] = await db.query(
            `SELECT * FROM tbl_rent WHERE stdId = ? ORDER BY Year DESC, RentPaidMonth DESC LIMIT 1`,
            [stdID]
        );

        let previousDues = 0;
        if (lastRentResult.length > 0) {
            previousDues = lastRentResult[0].Dues || 0;
        }

        // Step 3: Calculate the total current rent and dues
        const currentMonthRent = BasicRent + previousDues;
        const newDues = currentMonthRent - PaidAmount;

        // Step 4: Insert a new rent record
        await db.query(
            `INSERT INTO tbl_rent 
            (stdID, RentPaidMonth, Year, RentStatus, RentType, BasicRent, PaidAmount, Dues) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                stdID,
                RentPaidMonth,
                Year,
                newDues > 0 ? "Partially Paid" : "Paid", // Dynamic RentStatus
                RentType,
                BasicRent,
                PaidAmount,
                newDues > 0 ? newDues : 0
            ]
        );

        // Step 5: Return success response
        res.status(201).json({
            message: "Rent record created successfully.",
            statusCode: 201,
            // rentDetails: {
            //     stdID,
            //     RentPaidMonth,
            //     Year,
            //     RentStatus: newDues > 0 ? "Partially Paid" : "Paid",
            //     RentType,
            //     BasicRent,
            //     PaidAmount,
            //     Dues: newDues > 0 ? newDues : 0,
            // },
        });
    } catch (error) {
        res.status(500);
        throw new Error(`Error creating rent record: ${error.message}`);
    }     

})

//@decs Update expense
//@route GET /api/expense
//@access Public
const updateRental = asyncHandler(async (req, res) => {

});

//@decs Delete Expense
//@route GET /api/expense
//@access Public
const deleteRental = asyncHandler(async (req, res) => {

})

module.exports = {getAllRentals, getRentalById, createRental, updateRental, deleteRental}