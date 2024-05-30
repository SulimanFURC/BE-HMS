const asyncHandler = require("express-async-handler");
const db = require("../config/dbConnection");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

//@decs Register User
//@route POST /api/user/register
//@access Public
const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }
    try {
        // check if user already exists
        const [userExists] = await db.query("SELECT * FROM tbl_user WHERE email = ?", [email]);
        if (userExists.length > 0) {
            res.status(400).json({ message: "User Already Exists with this Email" });
            return;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [rows] = await db.query("INSERT INTO tbl_user (username, email, password) VALUES (?, ?, ?)", [username, email, hashedPassword]);
        res.status(201).json({ message: "User created", userId: rows.insertId });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
})

//@decs login user
//@route POST /api/user/login
//@access Public
const loginUser = asyncHandler(async (req, res) => {
    try {

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
})


//@decs Current User Info
//@route POST /api/user/current
//@access Public
const currentUser = asyncHandler(async (req, res) => {
    try {

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
})


module.exports = {registerUser, loginUser, currentUser}