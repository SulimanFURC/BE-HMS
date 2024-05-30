const express = require("express")
const router = express.Router();
const {getRooms, createRoom, updateRoom, deleteRoom} = require("../controllers/roomController");
const { validateToken } = require("../middleware/validateTokenHandler");

// Get all Rooms
router.route("/getAllRooms").get(validateToken, getRooms)

// Create Room
router.route("/createRoom").post(validateToken, createRoom)

// Update Room by id
router.route("/updateRoom/:id").put(validateToken, updateRoom)

// Delete Room by id
router.route("/deleteRoom/:id").delete(validateToken, deleteRoom)


module.exports = router;
