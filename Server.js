const express = require("express");
const errorHandler = require("./middleware/errorHandler");
const connection = require("./config/dbConnection");
const app = express();
const cors = require("cors");
const bodyParser = require('body-parser');
const requestLogger = require("./middleware/logger");

// ✅ Respect Railway's dynamic port assignment
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// ✅ Allow CORS for frontend access
app.use(cors({ origin: '*' }));

// ✅ Logging middleware
app.use(requestLogger);

// ✅ Health check (for Railway debugging)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Hostel Management Backend is running",
    port: PORT
  });
});

// Welcome
app.get("/", (req, res) => {
    res.send("Welcome to Hostel Management System");
});

// ✅ Mount routes
app.use("/api/students", require("./Routes/studentRoutes"));
app.use("/api/expenses", require("./Routes/expenseRoutes"));
app.use("/api/room", require("./Routes/roomRoutes"));
app.use("/api/dashboard", require("./Routes/dashboardRoutes"));
app.use("/api/users", require("./Routes/userRoutes"));
app.use("/api/rental", require("./Routes/rentalRoutes"));
// ✅ Global error handler
app.use(errorHandler);

// ✅ Start server with Railway port
const server = app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
// Optional: increase timeout for large requests
server.setTimeout(500000); // 5 minutes
