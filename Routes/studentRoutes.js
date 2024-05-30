const express = require("express")
const router = express.Router();
const {getStudents, getStudent, createStudent, updateStudent, deleteStudent} = require("../controllers/studentController");
const { validateToken } = require("../middleware/validateTokenHandler");

// Get all students 
router.route("/").get(validateToken, getStudents)

// Create Student
router.route("/").post(validateToken, createStudent)

// Get Single Student by ID
router.route("/:id").get(validateToken, getStudent)

// Update Single Student by ID
router.route("/:id").put(validateToken, updateStudent)


// Delete Single Student by ID
router.route("/:id").delete(validateToken, deleteStudent)

module.exports = router;
