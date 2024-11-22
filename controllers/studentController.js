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
const getStudents = asyncHandler(async(req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM tbl_students');
        rows.forEach(student => {
            if (student.picture) {
                student.picture = `${req.protocol}://${req.get('host')}/uploads/${path.basename(student.picture)}`;
            }
            if (student.cnic_front) {
                student.cnic_front = `${req.protocol}://${req.get('host')}/uploads/${path.basename(student.cnic_front)}`;
            }
            if (student.cnic_back) {
                student.cnic_back = `${req.protocol}://${req.get('host')}/uploads/${path.basename(student.cnic_back)}`;
            }
        });
        res.status(200).json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


//@decs Get Single Student
//@route GET /api/students
//@access Public
const getStudent = async(req, res) => {
    const studentId = req.params.id;
    try {
        const [rows] = await db.query('SELECT * FROM tbl_students WHERE stdID = ?', [studentId]);
        if (rows.length === 0) {
            res.status(404).json({ message: 'Student not found' });
            return;
        }

        const student = rows[0];
        if (student.picture) {
            student.picture = `${req.protocol}://${req.get('host')}/uploads/${path.basename(student.picture)}`;
        }
        if (student.cnic_front) {
            student.cnic_front = `${req.protocol}://${req.get('host')}/uploads/${path.basename(student.cnic_front)}`;
        }
        if (student.cnic_back) {
            student.cnic_back = `${req.protocol}://${req.get('host')}/uploads/${path.basename(student.cnic_back)}`;
        }

        res.status(200).json(student);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

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
    uploadImage(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }

        const studentId = req.params.id;
        const { name, cnic, admissionDate, basicRent, contactNo, bloodGroup, address, secondaryContactNo, email } = req.body;
        const picture = req.file ? req.file.path : null;

        try {
            // Check if the student exists
            const [rows] = await db.query('SELECT * FROM tbl_students WHERE stdID = ?', [studentId]);
            if (rows.length === 0) {
                return res.status(404).json({ message: "Record Not Found" });
            }

            // If a new picture is uploaded, delete the old one
            if (picture && rows[0].picture) {
                fs.unlinkSync(rows[0].picture);
            }

            // Update the student record
            const [result] = await db.query(
                `UPDATE tbl_students 
                SET name = ?, cnic = ?, admissionDate = ?, basicRent = ?, contactNo = ?, bloodGroup = ?, address = ?, secondaryContactNo = ?, email = ?, picture = ? 
                WHERE stdID = ?`,
                [name, cnic, admissionDate, basicRent, contactNo, bloodGroup, address, secondaryContactNo, email, picture || rows[0].picture, studentId]
            );

            return res.status(200).json({ message: 'Record updated', studentId: studentId });
        } catch (err) {
            return res.status(500).json({ message: err.message });
        }
    });
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