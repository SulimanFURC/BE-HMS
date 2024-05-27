const express = require("express")
const router = express.Router();
const {getRooms, createRoom, updateRoom, deleteRoom} = require("../controllers/roomController")

// Get all Rooms
router.route("/").get(getRooms)

// Create Room
router.route("/").post(createRoom)

// Update Room by id
router.route("/:id").put(updateRoom)

// Delete Room by id
router.route("/:id").delete(deleteRoom)


module.exports = router;
