const mysql = require('mysql2/promise');
const dotenv = require('dotenv').config();

const connection = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT, // Added port from .env
});

// connection.connect((err) => {
//     if (err) {
//         console.error('Error connecting to the database:', err.stack);
//         return;
//     }
//     console.log('Connected to the database as id ' + connection.threadId);
// });

module.exports = connection;
