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
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password' });
    }
    try {
        // Check if user exists
        const [rows] = await db.query('SELECT * FROM tbl_user WHERE email = ?', [email]);

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = rows[0];

        // Validate password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if(user && isPasswordValid) { 
            // Generate JWT token
            const token = jwt.sign({
                user: { 
                    id: user.id, 
                    username: user.username, 
                    email: user.email
                }, 
            },
            process.env.JWT_SECRET, 
            { expiresIn: '1h' });
            // Generate refresh token
            const refreshToken = jwt.sign(
                {
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email
                    },
                },
                process.env.REFRESH_TOKEN_SECRET,
                { expiresIn: '7d' }
            );
            // Store refresh token in database
            await db.query('UPDATE tbl_user SET refreshToken = ? WHERE id = ?', [refreshToken, user.id]);
            res.status(200).json({ token, refreshToken });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
})


//@decs Current User Info
//@route POST /api/user/current
//@access Public
const currentUser = asyncHandler(async (req, res) => {
    try {
        res.status(200).json(req.user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
})

//@decs Refresh Token
//@route POST /api/user/refreshToken
//@access Private
const refreshToken = asyncHandler(async (req, res, next) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ message: 'Refresh Token is required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

        // Check if token is valid and exists in the database
        const [rows] = await db.query('SELECT * FROM tbl_user WHERE id = ? AND refreshToken = ?', [decoded.user.id, token]);

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid Refresh Token' });
        }

        const user = rows[0];

        // Generate new access token
        const accessToken = jwt.sign(
            {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                },
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({ accessToken });
    } catch (err) {
        next(err);
    }
});


module.exports = {registerUser, loginUser, currentUser, refreshToken}