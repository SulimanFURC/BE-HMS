const asyncHandler = require("express-async-handler");
const db = require("../config/dbConnection");

//@desc    Get all rooms
//@route   GET /api/room
//@access  Public
const getRooms = asyncHandler(async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM tbl_room");
        res.status(200).json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
})

//@desc    Create a new room
//@route   POST /api/room
//@access  Private
const createRoom = asyncHandler(async (req, res)=> {
    const { totalCapacity, occupied, attachBath, description} = req.body;
    try {
        const [result] = await db.query("INSERT INTO tbl_room (totalCapacity, occupied, attachBath, description) VALUES (?, ?, ?, ?)", [totalCapacity, occupied, attachBath, description]);
        res.status(201).json({message: "Room Created", roomID: result.insertId});
    } catch (err) {
        res.status(500).json({message: err})
    }
})

//@desc    Update a room
//@route   PUT /api/room/:id
//@access  Private
const updateRoom = asyncHandler(async (req, res) => {
    const roomId = req.params.id
    const { totalCapacity, occupied, attachBath, description} = req.body
    try {
        const [rows] = await db.query("SELECT * FROM tbl_room WHERE roomId = ?", [roomId]);
        if(rows.length === 0) {
            res.status(404).json({message: "Room not found"});
            return;
        }
        const [result] = await db.query("UPDATE tbl_room SET totalCapacity = ?, occupied = ?, attachBath = ?, description = ? WHERE roomId = ?", [totalCapacity, occupied, attachBath, description, roomId]);
        res.status(200).json({message: `Room updated: ${req.params.id}`});
    } catch(err) {
        res.status(500).json({message: err})
    }
})

//@desc    Delete a room
//@route   DELETE /api/room/:id
//@access  Private
const deleteRoom = asyncHandler(async (req, res) => {
    const roomId = req.params.id;
    try {
        const [rows] = await db.query("SELECT * FROM tbl_room WHERE roomID = ?", [roomId]);
        if(rows.length === 0) {
            res.status(404).json({message: "Room not found"});
            return;
        }
        await db.query("DELETE FROM tbl_room WHERE roomID = ?", [roomId]);
        res.status(200).json({message: `Room : ${req.params.id} deleted`});
    } catch(err) {
        res.status(500).json({message: err});
    }
})

module.exports = {getRooms, createRoom, updateRoom, deleteRoom}