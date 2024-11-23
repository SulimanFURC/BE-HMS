const express = require("express")
const router = express.Router();
const {getStudents, getStudent, createStudent, updateStudent, deleteStudent} = require("../controllers/studentController");
const { validateToken } = require("../middleware/validateTokenHandler");
const uploadImage = require("../config/multer");

router.use(validateToken)
// Get all students 
router.route("/getAllStudents").get(getStudents)

// Create Student
router.route("/createStudent").post(uploadImage, createStudent)

// Get Single Student by ID
router.route("/getStudentById").post(getStudent)

// Update Single Student by ID
router.route("/updateStudent").put(updateStudent)


// Delete Single Student by ID
router.route("/deleteStudent").delete(deleteStudent)

module.exports = router;
