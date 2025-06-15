const express = require("express");
const errorHandler = require("./middleware/errorHandler");
const connection = require("./config/dbConnection");
const app = express();
const cors = require("cors");
const bodyParser = require('body-parser');
const requestLogger = require("./middleware/logger");

const PORT = process.env.PORT || 5000;


app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Configure CORS to allow requests from http://localhost:4200
app.use(cors({ origin: '*' }));

app.use(express.json());

// request middleware for all request 
app.use(requestLogger);

// ✅ Health check route (add it here)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Hostel Management Backend is running",
    port: PORT
  });
});

app.get("/", (req, res) => {
    res.send("Welcome to Hostel Management System");
});

app.use("/api/students", require("./Routes/studentRoutes"));
app.use("/api/expenses", require("./Routes/expenseRoutes"));
app.use("/api/room", require("./Routes/roomRoutes"));
app.use("/api/dashboard", require("./Routes/dashboardRoutes"));
app.use("/api/users", require("./Routes/userRoutes"));
app.use("/api/rental", require("./Routes/rentalRoutes"));
app.use(errorHandler);

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
server.setTimeout(500000); // Timeout after 5 Mintutes