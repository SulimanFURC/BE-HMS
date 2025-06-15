const db = require('../config/dbConnection');

// Middleware to attach logActivity to req
const activityLogger = (req, res, next) => {
    /**
     * Usage: req.logActivity(username, action)
     * Example: req.logActivity('Suliman', "Printed Invoice no #INV123")
     */
    req.logActivity = async (username, action) => {
        try {
            await db.query(
                'INSERT INTO activity_logs (username, action) VALUES (?, ?)',
                [username, action]
            );
        } catch (err) {
            // Log error but do not block request
            console.error('Activity log error:', err);
        }
    };
    next();
};

module.exports = activityLogger;