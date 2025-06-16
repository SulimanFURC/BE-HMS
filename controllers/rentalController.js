const asyncHandler = require("express-async-handler");
const db = require("../config/dbConnection");
const path = require('path');
const fs = require("fs")


//@desc    Get all rentals
//@route   GET /api/rental
//@access  Private
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

        // Fetch paginated records with student name
        const [rows] = await db.query(`
            SELECT r.*, s.name 
            FROM tbl_rent r
            JOIN tbl_students s ON r.stdID = s.stdID
            LIMIT ? OFFSET ?
        `, [limit, offset]);

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

//@desc    Get single rental by ID
//@route   POST /api/rental
//@access  Private
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

//@desc    Create a new rent record (cumulative payments supported)
//@route   POST /api/rent
//@access  Private
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

        const BasicRent = parseFloat(studentResult[0].basicRent);

        // Step 2: Fetch all previous rent records for the same student, month, and year
        const [previousRents] = await db.query(
            `SELECT PaidAmount FROM tbl_rent WHERE stdID = ? AND RentPaidMonth = ? AND Year = ?`,
            [stdID, RentPaidMonth, Year]
        );

        // Step 3: Calculate total paid so far (before this payment)
        let totalPaid = 0;
        for (const rent of previousRents) {
            totalPaid += parseFloat(rent.PaidAmount || 0);
        }

        // Step 4: Add current payment, but do not allow overpayment
        let newTotalPaid = totalPaid + parseFloat(PaidAmount);
        if (newTotalPaid > BasicRent) {
            return res.status(400).json({ message: `Total paid amount (${newTotalPaid}) exceeds basic rent (${BasicRent}).`, statusCode: 400 });
        }

        // Step 5: Calculate dues and status
        const newDues = BasicRent - newTotalPaid;
        const status = newDues === 0 ? "Paid" : "Partially Paid";

        // Step 6: Insert the rent record
        const [insertResult] = await db.query(
            `INSERT INTO tbl_rent 
            (stdID, RentPaidMonth, Year, RentStatus, RentType, BasicRent, PaidAmount, Dues) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                stdID,
                RentPaidMonth,
                Year,
                status,
                RentType,
                BasicRent,
                PaidAmount,
                newDues
            ]
        );

        if (insertResult.affectedRows === 0) {
            res.status(500);
            throw new Error("Failed to insert the rent record.");
        }

        // Step 7: Return success response
        res.status(201).json({
            message: "Rent record created successfully.",
            rentDetails: {
                stdID,
                RentPaidMonth,
                Year,
                RentStatus: status,
                RentType,
                BasicRent,
                PaidAmount,
                Dues: newDues,
            },
        });
    } catch (error) {
        res.status(500);
        throw new Error(`Error creating rent record: ${error.message}`);
    }
})

//@desc    Update a rent record (cumulative payments supported)
//@route   PUT /api/rental/updateRental
//@access  Private
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

        // Step 3: Fetch all rent records for the same student, month, and year (excluding this one)
        const [otherRents] = await db.query(
            `SELECT PaidAmount FROM tbl_rent WHERE stdID = ? AND RentPaidMonth = ? AND Year = ? AND RentID != ?`,
            [stdID, RentPaidMonth, Year, rentID]
        );

        // Step 4: Calculate total paid so far (excluding this record)
        let totalPaid = 0;
        for (const rent of otherRents) {
            totalPaid += parseFloat(rent.PaidAmount || 0);
        }

        // Step 5: Add the updated payment, but do not allow overpayment
        let newTotalPaid = totalPaid + parseFloat(PaidAmount);
        if (newTotalPaid > BasicRent) {
            return res.status(400).json({ message: `Total paid amount (${newTotalPaid}) exceeds basic rent (${BasicRent}).`, statusCode: 400 });
        }

        // Step 6: Calculate dues and status
        const newDues = BasicRent - newTotalPaid;
        const status = newDues === 0 ? "Paid" : "Partially Paid";

        // Step 7: Update the rent record
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
                status,
                RentType,
                PaidAmount,
                newDues,
                rentID,
            ]
        );

        if (updateResult.affectedRows === 0) {
            res.status(500);
            throw new Error("Failed to update the rent record.");
        }

        // Step 8: Return success response
        res.status(200).json({
            message: "Rent record updated successfully.",
            rentDetails: {
                RentID: rentID,
                stdID,
                RentPaidMonth,
                Year,
                RentStatus: status,
                RentType,
                BasicRent,
                PaidAmount,
                Dues: newDues,
            },
        });
    } catch (error) {
        res.status(500);
        throw new Error(`Error updating rent record: ${error.message}`);
    }
});

//@desc    Delete a rent record
//@route   DELETE /api/rental
//@access  Private
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


//@desc    Get student rent details
//@route   POST /api/rental/studentRentDetails
//@access  Private
const studentRentDetails = asyncHandler(async (req, res) => {
    const { stdID } = req.body;
  
    if (!stdID) {
      return res.status(400).json({ status: "error", message: "Student ID is required" });
    }
  
    try {
      // Step 1: Fetch rent data for the student from the database
      const [rentData] = await db.query(
        `SELECT * FROM tbl_rent WHERE stdID = ? ORDER BY Year, RentPaidMonth`,
        [stdID]
      );
  
      if (!rentData || rentData.length === 0) {
        return res.status(404).json({ status: "error", message: "No rent data found for the given student ID." });
      }
  
      // Step 2: Calculate dues and format the response
      let previousDues = 0;
      const rentDetails = rentData.map((item) => {
        const basicRent = item.BasicRent || 0;
        const paidAmount = item.PaidAmount || 0;
  
        // Calculate current month's dues
        const currentMonthDue = Math.floor(basicRent + previousDues - paidAmount);
  
        // Calculate total dues till this month
        const totalDues = Math.floor(previousDues + currentMonthDue);
  
        // Update previous dues for the next iteration
        previousDues = currentMonthDue > 0 ? currentMonthDue : 0;
  
        return {
          Month: item.RentPaidMonth,
          Year: item.Year,
          BasicRent: basicRent,
          PaymentMode: item.PaymentMode,
          AmountPaid: paidAmount,
          CurrentMonthDue: currentMonthDue > 0 ? currentMonthDue : 0,
          TotalDues: totalDues > 0 ? totalDues : 0,
        };
      });
  
      // Step 3: Return the response
      return res.status(200).json({ status: "success", data: rentDetails });
  
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: `Error fetching rent details: ${error.message}`,
      });
    }
  });

module.exports = {getAllRentals, getRentalById, createRental, updateRental, deleteRental, studentRentDetails}