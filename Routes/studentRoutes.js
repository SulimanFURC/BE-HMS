const express = require("express")
const router = express.Router();
const {getStudents, getStudent, createStudent, updateStudent, deleteStudent} = require("../controllers/studentController");
const { validateToken } = require("../middleware/validateTokenHandler");

// Get all students 
router.route("/getAllStudents").get(validateToken, getStudents)

// Create Student
router.route("/createStudent").post(validateToken, createStudent)

// Get Single Student by ID
router.route("/getStudentById/:id").get(validateToken, getStudent)

// Update Single Student by ID
router.route("/updateStudent/:id").put(validateToken, updateStudent)


// Delete Single Student by ID
router.route("/deleteStudent/:id").delete(validateToken, deleteStudent)

module.exports = router;
