const express = require("express")
const router = express.Router();
const {getStudents, getStudent, createStudent, updateStudent, deleteStudent} = require("../controllers/studentController");

// Get all students 
router.route("/").get(getStudents)

// Create Student
router.route("/").post(createStudent)

// Get Single Student by ID
router.route("/:id").get(getStudent)

// Update Single Student by ID
router.route("/:id").put(updateStudent)


// Delete Single Student by ID
router.route("/:id").delete(deleteStudent)

module.exports = router;
