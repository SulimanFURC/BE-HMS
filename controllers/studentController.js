const asyncHandler = require("express-async-handler");
const db = require("../config/dbConnection");
const upload = require('../config/multer');
const path = require('path');
const fs = require("fs")

// Middleware to handle image uploads
const uploadImage = upload.single('picture');

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

        res.status(200).json(student);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

//@decs Create New student
//@route GET /api/students
//@access Public

const createStudent = asyncHandler(async (req, res) => {
    uploadImage(req, res, async (err) => {
        if (err) {
            res.status(400).json({ message: err.message });
            return;
        }

        const { name, cnic, admissionDate, basicRent, contactNo, bloodGroup, address, secondaryContactNo, email } = req.body;
        const picture = req.file ? req.file.path : null; // File path or null if no file uploaded

        try {
            if (!name || !cnic || !admissionDate || !basicRent || !contactNo || !secondaryContactNo) {
                res.status(400).json({ message: "All fields are required" });
                return;
            }

            const [result] = await db.query(
                "INSERT INTO tbl_students (name, cnic, admissionDate, basicRent, contactNo, bloodGroup, address, secondaryContactNo, email, picture) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [name, cnic, admissionDate, basicRent, contactNo, bloodGroup, address, secondaryContactNo, email, picture]
            );
            res.status(201).json({ message: 'Student created', studentId: result.insertId });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    });
});

//@decs Update student
//@route GET /api/students
//@access Public
const updateStudent = asyncHandler(async(req, res) => {
    uploadImage(req, res, async (err) => {
        if(err) {
            res.status(400).json({message: err.message});
        }
        const studentId = req.params.id;
        const picture = req.file ? req.file.path : null;

        try {
            const [rows] = db.query('UPDATE tbl_students SET ? WHERE stdID = ?', [studentId]);
            if(rows.length === 0) {
                res.status(400).json({message: "Record Not Found"})
                return;
            }
            if(picture && rows[0].picture) {
                fs.unlinkSync(rows[0].picture);
            }
            const [result] = await db.query("UPDATE tbl_students SET name = ?, cnic = ?, admissionDate = ?, basicRent = ?, contactNo = ?, bloodGroup = ?, address = ?, secondaryContactNo = ?, email = ?, picture = ? WHERE stdID = ?",
            [name, cnic, admissionDate, basicRent, contactNo, bloodGroup, address, secondaryContactNo, email, picture || rows[0].picture, studentId]);
            res.status(200).json({ message: 'Record updated', studentId: studentId });
        } catch (err) {
            res.status(500).json({message: err.message});
        }
    })
    // res.status(200).json({message: `Update Single Student for id: ${req.params.id}`});
})

//@decs Delete student
//@route GET /api/students
//@access Public
const deleteStudent = asyncHandler(async(req, res) => {
    res.status(200).json({message: `Delete Single Student for id: ${req.params.id}`});
})



module.exports = {getStudents, getStudent, createStudent, updateStudent, deleteStudent}