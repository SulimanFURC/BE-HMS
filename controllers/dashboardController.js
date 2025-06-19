const asyncHandler = require('express-async-handler');
const db = require('../config/dbConnection');

// Calculate total income collectively for all years and months
const calculateTotalIncome = async () => {
    const [rows] = await db.query(
        `SELECT SUM(PaidAmount) AS totalIncome 
         FROM tbl_rent 
         WHERE RentStatus = 'Paid'`
    );
    return rows[0].totalIncome || 0;
};

// Calculate total expenses collectively for all years and months
const calculateTotalExpense = async () => {
    const [rows] = await db.query(
        `SELECT SUM(expAmount) AS totalExpense 
         FROM tbl_expense`
    );
    return rows[0].totalExpense || 0;
};

// Calculate income for the current and previous month
const calculateIncomeByMonth = async () => {
    const [rows] = await db.query(
        `SELECT Year, RentPaidMonth AS month, SUM(PaidAmount) AS income
         FROM tbl_rent 
         WHERE RentStatus = 'Paid'
         GROUP BY Year, RentPaidMonth
         ORDER BY Year DESC, RentPaidMonth DESC
         LIMIT 2`
    );
    return rows;
};

// Calculate expenses for the current and previous month
const calculateExpenseByMonth = async () => {
    const [rows] = await db.query(
        `SELECT YEAR(expDate) AS year, MONTH(expDate) AS month, SUM(expAmount) AS expense
         FROM tbl_expense 
         GROUP BY YEAR(expDate), MONTH(expDate)
         ORDER BY YEAR(expDate) DESC, MONTH(expDate) DESC
         LIMIT 2`
    );
    return rows;
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
    return rows[0] || { expName: null, totalSpent: 0 };
};

// Calculate percentage change between two values
const calculatePercentageChange = (current, previous) => {
    if (previous === 0) return current === 0 ? 0 : 100; // Handle division by zero
    return ((current - previous) / previous) * 100;
};

//@desc    Get dashboard summary data
//@route   GET /api/dashboard
//@access  Private
const getDashboardData = asyncHandler(async (req, res) => {
    try {
        // Total income and expenses
        const totalIncome = await calculateTotalIncome();
        const totalExpense = await calculateTotalExpense();
        const totalSavings = totalIncome - totalExpense;

        // Monthly income and expense data
        const incomeByMonth = await calculateIncomeByMonth();
        const expenseByMonth = await calculateExpenseByMonth();

        const currentIncome = incomeByMonth[0]?.income || 0;
        const previousIncome = incomeByMonth[1]?.income || 0;
        const incomeChange = calculatePercentageChange(currentIncome, previousIncome);

        const currentExpense = expenseByMonth[0]?.expense || 0;
        const previousExpense = expenseByMonth[1]?.expense || 0;
        const expenseChange = calculatePercentageChange(currentExpense, previousExpense);

        const currentSavings = currentIncome - currentExpense;
        const previousSavings = previousIncome - previousExpense;
        const savingsChange = calculatePercentageChange(currentSavings, previousSavings);

        // Most spending category
        const mostSpending = await calculateMostSpending();

        res.status(200).json({
            totalIncome,
            incomeChange: `${incomeChange.toFixed(2)}`,
            totalExpense,
            expenseChange: `${expenseChange.toFixed(2)}`,
            totalSavings,
            savingsChange: `${savingsChange.toFixed(2)}`,
            mostSpending
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



// Dashboard Chart 
// Helper function to calculate the previous 6 months
const getPreviousSixMonths = () => {
    const months = [];
    const currentDate = new Date();
    for (let i = 0; i < 6; i++) {
        months.push({
            year: currentDate.getFullYear(),
            month: currentDate.getMonth() + 1, // Month is 0-based, so add 1
        });
        currentDate.setMonth(currentDate.getMonth() - 1);
    }
    return months.reverse(); // To display in ascending order
};

//@desc    Get dashboard chart data for previous 6 months
//@route   GET /api/dashboard/chart
//@access  Private
const getMonthlyChartData = asyncHandler(async (req, res) => {
    try {
        const months = getPreviousSixMonths();

        const incomeData = await db.query(
            `SELECT Year, RentPaidMonth AS month, SUM(PaidAmount) AS totalIncome 
             FROM tbl_rent 
             WHERE RentStatus IN ('Paid', 'Partially Paid')
             GROUP BY Year, RentPaidMonth`
        );
        console.log("Income Data:", incomeData);
        const expenseData = await db.query(
            `SELECT YEAR(expDate) AS year, MONTH(expDate) AS month, SUM(expAmount) AS totalExpense 
             FROM tbl_expense 
             GROUP BY YEAR(expDate), MONTH(expDate)`
        );

        // Map the data for each month
        const chartData = months.map(({ year, month }) => {
            const incomeRecord = incomeData[0].find(
                (i) => Number(i.Year) === year && Number(i.month) === month
            );
            const expenseRecord = expenseData[0].find(
                (e) => Number(e.year) === year && Number(e.month) === month
            );

            const income = incomeRecord ? incomeRecord.totalIncome : 0;
            const expense = expenseRecord ? expenseRecord.totalExpense : 0;
            const savings = income - expense;

            return {
                year,
                month,
                income,
                expense,
                savings,
            };
        });

        res.status(200).json(chartData);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


module.exports = { getDashboardData, getMonthlyChartData };
