const express = require("express")
const router = express.Router();
const {getStudents, getStudent, createStudent, updateStudent, deleteStudent} = require("../controllers/studentController");
const { validateToken } = require("../middleware/validateTokenHandler");
const uploadImage = require("../config/multer");

// Get all students 
router.route("/getAllStudents").get(validateToken, getStudents)

// Create Student
router.route("/createStudent").post(validateToken, uploadImage, createStudent)

// Get Single Student by ID
router.route("/getStudentById").post(validateToken, getStudent)

// Update Single Student by ID
router.route("/updateStudent").put(validateToken, updateStudent)


// Delete Single Student by ID
router.route("/deleteStudent").delete(validateToken, deleteStudent)

module.exports = router;
