const asyncHandler = require("express-async-handler");
const db = require("../config/dbConnection");
const uploadImage = require('../config/multer');
const path = require('path');
const fs = require("fs");
const { uploadOnCloudinary } = require("../config/cloudinary");

// Middleware to handle image uploads
// const uploadImage = uploadImage.single('picture');

//@decs Get all students
//@route GET /api/students
//@access Public
const getStudents = asyncHandler(async (req, res) => {
    try {
        // Default pagination values
        const page = parseInt(req.query.page) || 1; // Default to page 1
        const pageSize = parseInt(req.query.pageSize) || 10; // Default to 10 records per page

        // Calculate offset and limit
        const offset = (page - 1) * pageSize;
        const limit = pageSize;

        // Get total number of records
        const [totalRowsResult] = await db.query('SELECT COUNT(*) AS total FROM tbl_students');
        const totalRecords = totalRowsResult[0].total;

        // Fetch paginated records
        const [rows] = await db.query('SELECT * FROM tbl_students LIMIT ? OFFSET ?', [limit, offset]);

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
        res.status(500).json({ message: err.message });
    }
});


//@decs Get Single Student
//@route GET /api/students
//@access Public
const getStudent = asyncHandler(async (req, res) => {
    const { studentId } = req.body; // Retrieve `studentId` from the request body

    try {
        // Validate input
        if (!studentId) {
            return res.status(400).json({ message: 'Student ID is required' });
        }

        // Fetch student record
        const [rows] = await db.query('SELECT * FROM tbl_students WHERE stdID = ?', [studentId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const student = rows[0];

        // No need to convert paths since URLs are directly stored from Cloudinary
        res.status(200).json(student);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});
//@decs Create New student
//@route GET /api/students
//@access Public

// Max file size (1MB)
const createStudent = asyncHandler(async (req, res) => {
    const { 
        name, 
        cnic, 
        admissionDate, 
        basicRent, 
        contactNo, 
        bloodGroup, 
        address, 
        secondaryContactNo, 
        email, 
        cnic_front, 
        cnic_back, 
        picture 
    } = req.body;

    try {
        // Validate required fields
        if (!name || !cnic || !admissionDate || !basicRent || !contactNo || !secondaryContactNo) {
            res.status(400).json({ message: 'All fields are required' });
            return;
        }

        // Insert student data into the database
        const [result] = await db.query(
            `INSERT INTO tbl_students 
            (name, cnic, admissionDate, basicRent, contactNo, bloodGroup, address, secondaryContactNo, email) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, cnic, admissionDate, basicRent, contactNo, bloodGroup, address, secondaryContactNo, email]
        );

        const studentId = result.insertId; // Get the student ID

        // Upload images to Cloudinary
        const pictureUrl = picture
            ? await uploadOnCloudinary(picture, `students/Student-${studentId}`, `picture-${Date.now()}.jpg`)
            : null;

        const cnicFrontUrl = cnic_front
            ? await uploadOnCloudinary(cnic_front, `students/Student-${studentId}`, `cnic-front-${Date.now()}.jpg`)
            : null;

        const cnicBackUrl = cnic_back
            ? await uploadOnCloudinary(cnic_back, `students/Student-${studentId}`, `cnic-back-${Date.now()}.jpg`)
            : null;

        // Update database with Cloudinary URLs
        await db.query(
            `UPDATE tbl_students SET picture = ?, cnic_front = ?, cnic_back = ? WHERE stdID = ?`,
            [pictureUrl, cnicFrontUrl, cnicBackUrl, studentId]
        );

        // Return success response
        res.status(201).json({ message: 'Student created', studentId, status: 201 });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

//@decs Update student
//@route GET /api/students
//@access Public
const updateStudent = asyncHandler(async (req, res) => {
    const {
        studentId, // Student ID from the request body
        name,
        cnic,
        admissionDate,
        basicRent,
        contactNo,
        bloodGroup,
        address,
        secondaryContactNo,
        email,
        cnic_front,
        cnic_back,
        picture
    } = req.body;

    try {
        // Validate required fields
        if (!studentId) {
            return res.status(400).json({ message: 'Student ID is required' });
        }

        // Fetch existing student record
        const [rows] = await db.query('SELECT * FROM tbl_students WHERE stdID = ?', [studentId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Record Not Found' });
        }

        const existingRecord = rows[0]; // Existing student record

        // Upload new images if provided, or retain existing ones
        const updatedPictureUrl = picture
            ? await uploadOnCloudinary(picture, `students/Student-${studentId}`, `picture-${Date.now()}.jpg`)
            : existingRecord.picture;

        const updatedCnicFrontUrl = cnic_front
            ? await uploadOnCloudinary(cnic_front, `students/Student-${studentId}`, `cnic-front-${Date.now()}.jpg`)
            : existingRecord.cnic_front;

        const updatedCnicBackUrl = cnic_back
            ? await uploadOnCloudinary(cnic_back, `students/Student-${studentId}`, `cnic-back-${Date.now()}.jpg`)
            : existingRecord.cnic_back;

        // Update student record with provided or existing values
        await db.query(
            `UPDATE tbl_students 
            SET 
                name = ?, 
                cnic = ?, 
                admissionDate = ?, 
                basicRent = ?, 
                contactNo = ?, 
                bloodGroup = ?, 
                address = ?, 
                secondaryContactNo = ?, 
                email = ?, 
                picture = ?, 
                cnic_front = ?, 
                cnic_back = ? 
            WHERE stdID = ?`,
            [
                name || existingRecord.name,
                cnic || existingRecord.cnic,
                admissionDate || existingRecord.admissionDate,
                basicRent || existingRecord.basicRent,
                contactNo || existingRecord.contactNo,
                bloodGroup || existingRecord.bloodGroup,
                address || existingRecord.address,
                secondaryContactNo || existingRecord.secondaryContactNo,
                email || existingRecord.email,
                updatedPictureUrl,
                updatedCnicFrontUrl,
                updatedCnicBackUrl,
                studentId
            ]
        );

        // Success response
        res.status(200).json({ message: 'Record updated', studentId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

//@decs Delete student
//@route GET /api/students
//@access Public
const deleteStudent = asyncHandler(async (req, res) => {
    const { stdID: studentId } = req.body; // Extract the student ID from the request body

    try {
        // Validate that the ID is provided
        if (!studentId) {
            return res.status(400).json({ message: 'Student ID is required' });
        }

        // Check if the student exists
        const [rows] = await db.query('SELECT * FROM tbl_students WHERE stdID = ?', [studentId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Record not found' });
        }

        // Delete associated image files if they exist
        if (rows[0].picture) {
            try {
                fs.unlinkSync(rows[0].picture);
            } catch (err) {
                console.error('Error deleting picture file:', err.message);
            }
        }

        if (rows[0].cnic_front) {
            try {
                fs.unlinkSync(rows[0].cnic_front);
            } catch (err) {
                console.error('Error deleting CNIC front file:', err.message);
            }
        }

        if (rows[0].cnic_back) {
            try {
                fs.unlinkSync(rows[0].cnic_back);
            } catch (err) {
                console.error('Error deleting CNIC back file:', err.message);
            }
        }

        // Delete the student record
        await db.query('DELETE FROM tbl_students WHERE stdID = ?', [studentId]);

        res.status(200).json({ message: 'Record deleted successfully', studentId });
    } catch (err) {
        console.error('Error deleting student record:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});



module.exports = {getStudents, getStudent, createStudent, updateStudent, deleteStudent}