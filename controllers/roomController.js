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
const createRoom = asyncHandler(async (req, res)=> {
    const { totalCapacity, occupied, attachBath, description} = req.body;
    try {
        const [result] = await db.query("INSERT INTO tbl_room (totalCapacity, occupied, attachBath, description) VALUES (?, ?, ?, ?)", [totalCapacity, occupied, attachBath, description]);
        res.status(200).json({message: "Room Created", roomID: result.insertId});
    } catch (err) {
        res.status(500).json({message: err})
    }
    res.status(200).json({message: "Create Room"});
})

//@decs Update Room
//@route GET /api/room
//@access Public
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
        res.status("200").json({message: `Room updated: ${req.params.id}`});
    } catch(err) {
        res.status(500).json({message: err})
    }
})

//@decs Delete Room
//@route GET /api/room
//@access Public
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
    res.status(200).json({message: `Delete Single Room by id: ${req.params.id}`});
})

module.exports = {getRooms, createRoom, updateRoom, deleteRoom}