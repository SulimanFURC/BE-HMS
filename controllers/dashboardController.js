const asyncHandler = require('express-async-handler');
const db = require('../config/dbConnection'); // Make sure this is correctly configured

// Calculate total income for each month
const calculateTotalIncome = async () => {
    const [rows] = await db.query(
        `SELECT Year, RentPaidMonth AS month, SUM(PaidAmount) AS totalIncome 
         FROM tbl_rent 
         WHERE RentStatus = 'Paid' 
         GROUP BY Year, RentPaidMonth`
    );
    return rows;
};

// Calculate total expenses for each month
const calculateTotalExpense = async () => {
    const [rows] = await db.query(
        `SELECT YEAR(expDate) AS year, MONTH(expDate) AS month, SUM(expAmount) AS totalExpense 
         FROM tbl_expense 
         GROUP BY YEAR(expDate), MONTH(expDate)`
    );
    return rows;
};

// Calculate profit/loss for each month
const calculateProfitLoss = (totalIncome, totalExpense) => {
    const profitLoss = totalIncome.map(income => {
        const expense = totalExpense.find(exp => exp.year === income.Year && exp.month === income.month);
        const monthlyExpense = expense ? expense.totalExpense : 0;
        const profit = income.totalIncome - monthlyExpense;
        return {
            year: income.Year,
            month: income.month,
            profit: profit,
        };
    });

    return profitLoss;
};

// Calculate the most spending category
const calculateMostSpending = async () => {
    const [rows] = await db.query(
        `SELECT expName, SUM(expAmount) AS totalSpent 
         FROM tbl_expense 
         GROUP BY expName 
         ORDER BY totalSpent DESC 
         LIMIT 1`
    );
    return rows[0];
};

// Get dashboard data
const getDashboardData = asyncHandler(async (req, res) => {
    try {
        const totalIncome = await calculateTotalIncome();
        const totalExpense = await calculateTotalExpense();
        const profitLoss = calculateProfitLoss(totalIncome, totalExpense);
        const mostSpending = await calculateMostSpending();

        res.status(200).json({
            totalIncome,
            totalExpense,
            profitLoss,
            mostSpending
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = { getDashboardData };
