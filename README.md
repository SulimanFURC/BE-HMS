# Hostel Management System Backend

This project is a Node.js and Express-based backend for a Hostel Management System. It provides RESTful APIs for managing students, rooms, expenses, rentals, users, and dashboard analytics. The backend uses MySQL as the database and supports authentication with JWT.

## Features

- **User Authentication**: Register, login, JWT-based authentication, and token refresh.
- **Student Management**: CRUD operations for student records, including image uploads.
- **Room Management**: CRUD operations for hostel rooms.
- **Expense Management**: Track and manage expenses with file attachments.
- **Rental Management**: Manage rent payments, view rental history, and student-specific rental details.
- **Dashboard Analytics**: Get aggregated data for income, expenses, and trends.
- **Middleware**: Logging, error handling, and token validation.
- **Cloudinary Integration**: For image uploads (students, expenses).

## Project Structure

```
BE-HostelManagement/
├── Server.js                # Main server entry point
├── package.json             # Project metadata and dependencies
├── constants.js             # HTTP status code constants
├── config/                  # Configuration files (DB, Cloudinary, Multer)
├── controllers/             # Route handler logic for each resource
├── middleware/              # Custom middleware (auth, logger, error handler)
├── Routes/                  # Express route definitions
```

## Getting Started

### Prerequisites
- Node.js (v14+ recommended)
- MySQL database
- Cloudinary account (for image uploads)

### Installation
1. Clone the repository:
   ```sh
   git clone <repo-url>
   cd BE-HostelManagement
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create a `.env` file in the root directory and add your environment variables:
   ```env
   PORT=5000
   DB_HOST=your_db_host
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=your_db_name
   JWT_SECRET=your_jwt_secret
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```
4. Start the server:
   ```sh
   npm run dev
   ```
   The server will run on `http://localhost:5000` by default.

## API Endpoints

### Authentication
- `POST /api/users/register` — Register a new user
- `POST /api/users/login` — Login and receive JWT
- `GET /api/users/current` — Get current user info (protected)
- `POST /api/users/refresh-token` — Refresh JWT

### Students
- `GET /api/students/getAllStudents` — List students (protected)
- `POST /api/students/createStudent` — Add a student (protected, supports image upload)
- `POST /api/students/getStudentById` — Get student by ID (protected)
- `PUT /api/students/updateStudent` — Update student (protected)
- `DELETE /api/students/deleteStudent` — Delete student (protected)

### Rooms
- `GET /api/room/getAllRooms` — List rooms (protected)
- `POST /api/room/createRoom` — Add a room (protected)
- `PUT /api/room/updateRoom/:id` — Update room (protected)
- `DELETE /api/room/deleteRoom/:id` — Delete room (protected)

### Expenses
- `GET /api/expenses/getAllExpenses` — List expenses (protected)
- `POST /api/expenses/createExpense` — Add an expense (protected, supports file upload)
- `POST /api/expenses/getExpenseById` — Get expense by ID (protected)
- `PUT /api/expenses/updateExpense` — Update expense (protected)
- `DELETE /api/expenses/deleteExpense` — Delete expense (protected)
- `POST /api/expenses/expenseByDateRange` — Expenses by date range (protected)

### Rentals
- `GET /api/rental/getAllRentals` — List rentals (protected)
- `POST /api/rental/getRentalById` — Get rental by ID (protected)
- `POST /api/rental/createRental` — Add a rental record (protected)
- `PUT /api/rental/updateRental` — Update rental (protected)
- `DELETE /api/rental/deleteRental` — Delete rental (protected)
- `POST /api/rental/getStudentRentDetails` — Get rental details for a student (protected)

### Dashboard
- `GET /api/dashboard/getDashboardData` — Get dashboard summary (protected)
- `GET /api/dashboard/getDashboardChart` — Get dashboard chart data (protected)

## Environment Variables
- `PORT`: Server port
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: MySQL database credentials
- `JWT_SECRET`: Secret for JWT signing
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: Cloudinary credentials

## License
MIT

---
**Author:** Suliman Munawar Khan
