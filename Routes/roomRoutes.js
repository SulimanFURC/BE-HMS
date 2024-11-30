const express = require("express")
const router = express.Router();
const {getRooms, createRoom, updateRoom, deleteRoom} = require("../controllers/roomController");
const { validateToken } = require("../middleware/validateTokenHandler");

router.use(validateToken);

// Get all Rooms
router.route("/getAllRooms").get(getRooms)

// Create Room
router.route("/createRoom").post(createRoom)

// Update Room by id
router.route("/updateRoom/:id").put(updateRoom)

// Delete Room by id
router.route("/deleteRoom/:id").delete(deleteRoom)


module.exports = router;
