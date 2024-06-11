const express = require("express");
const errorHandler = require("./middleware/errorHandler");
const connection = require("./config/dbConnection");
const dotenv = require("dotenv").config();
const path = require("path")
const app = express();
const cors = require("cors");

PORT = process.env.PORT || 5000;

// Configure CORS to allow requests from http://localhost:4200
app.use(cors({ origin: 'http://localhost:4200' }));

app.use(express.json());
app.use("/api/students", require("./Routes/studentRoutes"));
app.use("/api/expenses", require("./Routes/expenseRoutes"));
app.use("/api/room", require("./Routes/roomRoutes"));
app.use("/api/dashboard", require("./Routes/dashboardRoutes"));
app.use("/api/users", require("./Routes/userRoutes"));
app.use(errorHandler);

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})