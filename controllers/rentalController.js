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
    const { rentID } = req.body;

    if (!rentID) {
        return res.status(400).json({ message: "rentID is required." });
    }

    try {
        // Step 1: Fetch the rental record based on RentID
        const [rentalRecord] = await db.query(
            `SELECT * FROM tbl_rent WHERE RentID = ?`,
            [rentID]
        );

        if (rentalRecord.length === 0) {
            return res.status(404).json({ message: "No rental record found.", statusCode: 404 });
        }

        const rental = rentalRecord[0];

        // Step 2: Fetch all rental payments for the student (stdID)
        const [allRentals] = await db.query(
            `SELECT * FROM tbl_rent WHERE stdID = ? ORDER BY Year, RentPaidMonth`,
            [rental.stdID]
        );

        // Step 3: Calculate total payments done and total dues
        let totalPayments = 0;
        let totalDues = 0;

        for (const record of allRentals) {
            totalPayments += parseFloat(record.PaidAmount || 0);
            totalDues += parseFloat(record.Dues || 0);
        }

        // Step 4: Fetch the student's basic rent and security fee
        const [studentData] = await db.query(
            `SELECT basicRent, securityFee FROM tbl_students WHERE stdID = ?`,
            [rental.stdID]
        );

        if (studentData.length === 0) {
            return res.status(404).json({ message: "Student record not found.", statusCode: 404 });
        }

        const { basicRent, securityFee } = studentData[0];

        // Step 5: Calculate current month dues (if applicable)
        const currentMonth = new Date().getMonth() + 1; // JavaScript months are 0-indexed
        const currentYear = new Date().getFullYear();
        const currentRental = allRentals.find(
            (record) => record.RentPaidMonth === currentMonth && record.Year === currentYear
        );
        const currentMonthDues = currentRental ? parseFloat(currentRental.Dues || 0) : 0;

        // Step 6: Return the response
        res.status(200).json({
            message: "Rental details fetched successfully.",
            rentalDetails: {
                rental, // Current rental record
                totalPayments,
                totalDues,
                currentMonthDues,
                securityFee: securityFee || 0,
                basicRent,
                rentalHistory: allRentals, // Complete rental payment history
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: `Error fetching rental record: ${err.message}` });
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
        // Step 1: Fetch the student's basic rent from the student table
        const [studentResult] = await db.query(
            `SELECT basicRent FROM tbl_students WHERE stdID = ?`,
            [stdID]
        );

        if (studentResult.length === 0) {
            res.status(404);
            throw new Error(`Student with ID ${stdID} not found.`);
        }

        const BasicRent = studentResult[0].basicRent;

        // Step 2: Fetch the most recent rent record for the student
        const [lastRentResult] = await db.query(
            `SELECT * FROM tbl_rent WHERE stdID = ? ORDER BY Year DESC, RentPaidMonth DESC LIMIT 1`,
            [stdID]
        );

        // Initialize previous dues
        let previousDues = 0;
        if (lastRentResult.length > 0) {
            previousDues = parseFloat(lastRentResult[0].Dues) || 0;
        }

        // Step 3: Calculate the total rent due for the current month
        const currentMonthRent = parseFloat(BasicRent) + parseFloat(previousDues);

        // Step 4: Calculate dues after the payment
        const newDues = currentMonthRent - parseFloat(PaidAmount);

        // Step 5: Insert the rent record
        const [insertResult] = await db.query(
            `INSERT INTO tbl_rent 
            (stdID, RentPaidMonth, Year, RentStatus, RentType, BasicRent, PaidAmount, Dues) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                stdID,
                RentPaidMonth,
                Year,
                newDues > 0 ? "Partially Paid" : "Paid", // Determine RentStatus dynamically
                RentType,
                BasicRent,
                PaidAmount,
                newDues > 0 ? newDues : 0 // Ensure dues are non-negative
            ]
        );

        if (insertResult.affectedRows === 0) {
            res.status(500);
            throw new Error("Failed to insert the rent record.");
        }

        // Step 6: Return success response
        res.status(201).json({
            message: "Rent record created successfully.",
            rentDetails: {
                stdID,
                RentPaidMonth,
                Year,
                RentStatus: newDues > 0 ? "Partially Paid" : "Paid",
                RentType,
                BasicRent,
                PaidAmount,
                Dues: newDues > 0 ? newDues : 0,
            },
        });
    } catch (error) {
        res.status(500);
        throw new Error(`Error creating rent record: ${error.message}`);
    }
})

//@decs Update rental
//@route GET /api/rental
//@access Private
const updateRental = asyncHandler(async (req, res) => {
    const { rentID, RentPaidMonth, Year, RentStatus, RentType, PaidAmount } = req.body;
    if (!rentID) {
        res.status(400);
        throw new Error("RentID is required.");
    }

    if (!RentPaidMonth || !Year || !PaidAmount) {
        res.status(400);
        throw new Error("Please provide all required fields (RentPaidMonth, Year, PaidAmount).");
    }

    try {
        // Step 1: Fetch the existing rent record
        const [existingRent] = await db.query(`SELECT * FROM tbl_rent WHERE RentID = ?`, [rentID]);

        if (existingRent.length === 0) {
            res.status(404);
            throw new Error(`No rent record found with ID ${rentID}.`);
        }

        const rentRecord = existingRent[0];
        const stdID = rentRecord.stdID;

        // Step 2: Fetch the student's basic rent from the student table
        const [studentResult] = await db.query(
            `SELECT basicRent FROM tbl_students WHERE stdID = ?`,
            [stdID]
        );

        if (studentResult.length === 0) {
            res.status(404);
            throw new Error(`Student with ID ${stdID} not found.`);
        }

        const BasicRent = parseFloat(studentResult[0].basicRent);

        // Step 3: Recalculate dues
        const previousDues = parseFloat(rentRecord.Dues) || 0;
        const currentMonthRent = BasicRent + previousDues;
        const newDues = currentMonthRent - parseFloat(PaidAmount);

        // Step 4: Update the rent record
        const [updateResult] = await db.query(
            `UPDATE tbl_rent 
            SET RentPaidMonth = ?, 
                Year = ?, 
                RentStatus = ?, 
                RentType = ?, 
                PaidAmount = ?, 
                Dues = ? 
            WHERE RentID = ?`,
            [
                RentPaidMonth,
                Year,
                newDues > 0 ? "Partially Paid" : "Paid", // Dynamically set RentStatus
                RentType,
                PaidAmount,
                newDues > 0 ? newDues : 0, // Ensure dues are non-negative
                rentID,
            ]
        );

        if (updateResult.affectedRows === 0) {
            res.status(500);
            throw new Error("Failed to update the rent record.");
        }

        // Step 5: Return success response
        res.status(200).json({
            message: "Rent record updated successfully.",
            rentDetails: {
                RentID: rentID,
                stdID,
                RentPaidMonth,
                Year,
                RentStatus: newDues > 0 ? "Partially Paid" : "Paid",
                RentType,
                BasicRent,
                PaidAmount,
                Dues: newDues > 0 ? newDues : 0,
            },
        });
    } catch (error) {
        res.status(500);
        throw new Error(`Error updating rent record: ${error.message}`);
    }
});

//@decs Delete Rental
//@route GET /api/Rental
//@access Private
const deleteRental = asyncHandler(async (req, res) => {
    const {rentID} = req.body;
    if(!rentID){
        res.status(404);
        throw new Error("Rend ID not found");
    }
    try{
        const [existingRent] = await db.query(`SELECT * FROM tbl_rent WHERE RentID = ?`, [rentID]);
        if (existingRent.length === 0) {
            res.status(404);
            throw new Error(`No rent record found with ID ${rentID}.`);
        }
        
        // step2: if record exits then delete it
        const [deleteResult] = await db.query(`DELETE FROM tbl_rent WHERE RentID = ?`, [rentID]);
        if (deleteResult.affectedRows === 0) {
            res.status(500);
            throw new Error("Failed to delete the rental record.");
        }

        // Step 3: Return success response
        res.status(200).json({
            message: `Rental record with ID ${rentID} deleted successfully.`,
            statusCode: 200,
        });
        
    } catch(error) {
        res.status(500);
        throw new Error(`Error deleting rental record: ${error.message}`);
    }
})

module.exports = {getAllRentals, getRentalById, createRental, updateRental, deleteRental}