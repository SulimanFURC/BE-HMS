const express = require("express");
const { registerUser, loginUser, currentUser, refreshToken } = require("../controllers/userController");
const { validateToken } = require("../middleware/validateTokenHandler");
const router = express.Router();

router.post("/register", registerUser)
router.post("/login", loginUser)
router.get("/current", validateToken, currentUser)
router.post('/refresh-token', refreshToken);


module.exports = router