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

        // Search and filter params
        const search = req.query.search ? req.query.search.trim() : '';
        const rentStatus = req.query.rentStatus ? req.query.rentStatus.trim() : '';

        // Build WHERE clause and params
        let whereClause = '';
        let params = [];
        if (search && rentStatus) {
            whereClause = 'WHERE LOWER(s.name) LIKE ? AND r.rentStatus = ?';
            params.push(`%${search.toLowerCase()}%`, rentStatus);
        } else if (search) {
            whereClause = 'WHERE LOWER(s.name) LIKE ?';
            params.push(`%${search.toLowerCase()}%`);
        } else if (rentStatus) {
            whereClause = 'WHERE r.rentStatus = ?';
            params.push(rentStatus);
        }

        // Get total number of records (with filters)
        const [totalRowsResult] = await db.query(
            `SELECT COUNT(*) AS total FROM tbl_rent r JOIN tbl_students s ON r.stdID = s.stdID ${whereClause}`,
            params
        );
        const totalRecords = totalRowsResult[0].total;

        // Fetch paginated records with student name (with filters)
        const [rows] = await db.query(
            `SELECT r.*, s.name FROM tbl_rent r JOIN tbl_students s ON r.stdID = s.stdID ${whereClause} LIMIT ? OFFSET ?`,
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
const createRental = asyncHandler(async (req, res) => {
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

        // Step 2: Get previous month's dues (if any)
        let prevMonth = parseInt(RentPaidMonth) - 1;
        let prevYear = parseInt(Year);
        if (prevMonth === 0) {
            prevMonth = 12;
            prevYear = prevYear - 1;
        }
        let previousDues = 0;
        const [prevRentRows] = await db.query(
            `SELECT Dues FROM tbl_rent WHERE stdID = ? AND Year = ? AND RentPaidMonth = ? ORDER BY RentID DESC LIMIT 1`,
            [stdID, prevYear, prevMonth]
        );
        if (prevRentRows.length > 0) {
            previousDues = parseFloat(prevRentRows[0].Dues || 0);
        }

        // Step 3: Calculate total amount payable (basic rent + previous dues)
        const totalPayable = BasicRent + previousDues;

        // Step 4: Calculate total paid for this month (including this payment)
        const [sameMonthRows] = await db.query(
            `SELECT SUM(PaidAmount) as totalPaid FROM tbl_rent WHERE stdID = ? AND Year = ? AND RentPaidMonth = ?`,
            [stdID, Year, RentPaidMonth]
        );
        let alreadyPaid = parseFloat(sameMonthRows[0].totalPaid || 0);

        // If this is the first payment for this month, alreadyPaid will be 0

        // Add the current payment to alreadyPaid (since we are about to insert it)
        let totalPaidThisMonth = alreadyPaid + parseFloat(PaidAmount);


        // Step 5: Calculate new due after payment
        let newDue = totalPayable - totalPaidThisMonth;
        if (newDue < 0) newDue = 0; // No negative dues

        // Step 6: Determine rent status
        let status = "Partially Paid";
        if (newDue === 0) status = "Paid";

        // Step 7: Insert the rent record
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
                newDue
            ]
        );

        if (insertResult.affectedRows === 0) {
            res.status(500);
            throw new Error("Failed to insert the rent record.");
        }

        // Step 8: Return success response
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
                PreviousDues: previousDues,
                TotalPayable: totalPayable,
                Dues: newDue,
            },
        });
    } catch (error) {
        console.log('Error creating rent record:', error);
        res.status(500);
        throw new Error(`Error creating rent record: ${error.message}`);
    }
});

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

        // Step 3: Get previous month's dues (if any)
        let prevMonth = parseInt(RentPaidMonth) - 1;
        let prevYear = parseInt(Year);
        if (prevMonth === 0) {
            prevMonth = 12;
            prevYear = prevYear - 1;
        }
        let previousDues = 0;
        const [prevRentRows] = await db.query(
            `SELECT Dues FROM tbl_rent WHERE stdID = ? AND Year = ? AND RentPaidMonth = ? ORDER BY RentID DESC LIMIT 1`,
            [stdID, prevYear, prevMonth]
        );
        if (prevRentRows.length > 0) {
            previousDues = parseFloat(prevRentRows[0].Dues || 0);
        }

        // Step 4: Calculate total amount payable (basic rent + previous dues)
        const totalPayable = BasicRent + previousDues;

        // Step 5: Fetch all rent records for the same student, month, and year (excluding this one)
        const [otherRents] = await db.query(
            `SELECT PaidAmount FROM tbl_rent WHERE stdID = ? AND RentPaidMonth = ? AND Year = ? AND RentID != ?`,
            [stdID, RentPaidMonth, Year, rentID]
        );
        // Step 6: Calculate total paid so far (excluding this record)
        let totalPaid = 0;
        for (const rent of otherRents) {
            totalPaid += parseFloat(rent.PaidAmount || 0);
        }
        // Step 7: Add the updated payment
        let newTotalPaid = totalPaid + parseFloat(PaidAmount);
        // Step 8: Calculate new due after payment
        let newDues = totalPayable - newTotalPaid;
        if (newDues < 0) newDues = 0;
        // Step 9: Determine rent status
        const status = newDues === 0 ? "Paid" : "Partially Paid";

        // Step 10: Update the rent record
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

        // Step 11: Return success response
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
                PreviousDues: previousDues,
                TotalPayable: totalPayable,
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

//@desc    Generate invoice for a student
//@route   POST /api/rental/invoice
//@access  Private
const generateInvoice = asyncHandler(async (req, res) => {
    const { stdID } = req.body;
    if (!stdID) {
        return res.status(400).json({ message: 'Student ID (stdID) is required.' });
    }
    try {
        // Fetch student details
        const [studentRows] = await db.query('SELECT name, stdID, roomNumber FROM tbl_students WHERE stdID = ?', [stdID]);
        if (!studentRows || studentRows.length === 0) {
            return res.status(404).json({ message: 'Student not found.' });
        }
        const student = studentRows[0];

        // Get current date info
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // JS months are 0-indexed
        const monthName = now.toLocaleString('default', { month: 'long' });
        const dateStr = now.toISOString().split('T')[0];
        const dueDate = new Date(now.getFullYear(), now.getMonth(), 10).toISOString().split('T')[0];

        // Fetch current month's rent record
        const [currentRentRows] = await db.query(
            'SELECT * FROM tbl_rent WHERE stdID = ? AND Year = ? AND RentPaidMonth = ?',
            [stdID, year, month]
        );
        if (!currentRentRows || currentRentRows.length === 0) {
            return res.status(404).json({ message: 'No rent record found for the current month.' });
        }
        const currentRent = currentRentRows[0];

        // Fetch previous month's dues
        let prevMonth = month - 1;
        let prevYear = year;
        if (prevMonth === 0) {
            prevMonth = 12;
            prevYear = year - 1;
        }
        const [prevRentRows] = await db.query(
            'SELECT Dues FROM tbl_rent WHERE stdID = ? AND Year = ? AND RentPaidMonth = ?',
            [stdID, prevYear, prevMonth]
        );
        const previousMonthDues = prevRentRows.length > 0 ? parseFloat(prevRentRows[0].Dues || 0) : 0;

        // Calculate totals
        const basicRent = parseFloat(currentRent.BasicRent || 0);
        const amountPaid = parseFloat(currentRent.PaidAmount || 0);
        const totalDues = basicRent + previousMonthDues;
        const totalAmountPayable = totalDues;
        const balanceDue = totalAmountPayable - amountPaid;

        // Fetch previous 6 months’ payment history
        const [historyRows] = await db.query(
            `SELECT Year, RentPaidMonth, PaidAmount, RentStatus FROM tbl_rent WHERE stdID = ? AND (Year < ? OR (Year = ? AND RentPaidMonth < ?)) ORDER BY Year DESC, RentPaidMonth DESC LIMIT 6`,
            [stdID, year, year, month]
        );
        const paymentHistory = historyRows.map(row => ({
            year: row.Year,
            month: new Date(row.Year, row.RentPaidMonth - 1).toLocaleString('default', { month: 'long' }),
            amountPaid: parseFloat(row.PaidAmount || 0),
            status: row.RentStatus || 'Unknown'
        }));

        // Generate invoice number
        const stdIdStr = String(student.stdID);
        const last4 = stdIdStr.slice(-4);
        const invoiceNumber = `INV-${year}-${String(month).padStart(2, '0')}-${last4}`;

        // Compose response
        res.status(200).json({
            invoiceNumber,
            date: dateStr,
            dueDate: dueDate,
            student: {
                name: student.name,
                id: student.stdID,
                roomNo: student.roomNumber
            },
            month: monthName,
            year: year,
            basicRent: basicRent,
            previousMonthDues: previousMonthDues,
            totalDues: totalDues,
            totalAmountPayable: totalAmountPayable,
            amountPaid: amountPaid,
            balanceDue: balanceDue,
            paymentHistory,
            notes: [
                'Please pay any outstanding dues by the due date to avoid late fees.',
                'Payment can be made via Bank Transfer, JazzCash, EasyPaisa or cash at the hostel office.',
                'Thank you for your timely payment!'
            ],
            hostelInfo: {
                name: 'Khan Hostel',
                address: 'Rose Lane 5, New Lalazar Rawalpindi, Pakistan',
                phone: '+92 302 5532270',
                email: 'sullaimaan@gmail.com'
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Error generating invoice: ' + err.message });
    }
});

module.exports = {getAllRentals, getRentalById, createRental, updateRental, deleteRental, studentRentDetails, generateInvoice}