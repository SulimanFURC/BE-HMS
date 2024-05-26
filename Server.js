const express = require("express");
const errorHandler = require("./middleware/errorHandler");
const connection = require("./config/dbConnection");
const dotenv = require("dotenv").config();
const path = require("path")
const app = express();
PORT = process.env.PORT || 5000;

app.use(express.json());
app.use("/api/students", require("./Routes/studentRoutes"));
app.use("/api/expenses", require("./Routes/expenseRoutes"));
app.use(errorHandler);

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})