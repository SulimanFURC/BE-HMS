const asyncHandler = require("express-async-handler");
const db = require("../config/dbConnection");

//@decs Get all room
//@route GET /api/room
//@access Public
const getRooms = asyncHandler(async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM tbl_room");
        res.status(200).json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
})

//@decs Create room
//@route GET /api/room
//@access Public
const createRoom = (req, res)=> {
    res.status(200).json({message: "Create Room"});
}

//@decs Update Room
//@route GET /api/room
//@access Public
const updateRoom = (req, res) => {
    res.status(200).json({message: `Update Single Room by id: ${req.params.id}`});
}

//@decs Delete Room
//@route GET /api/room
//@access Public
const deleteRoom = (req, res) => {
    res.status(200).json({message: `Delete Single Room by id: ${req.params.id}`});
}

module.exports = {getRooms, createRoom, updateRoom, deleteRoom}