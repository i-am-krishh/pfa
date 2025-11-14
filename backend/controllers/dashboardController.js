import Income from '../models/Income.js';
import Expense from '../models/Expense.js';
import Savings from '../models/Savings.js';
import Investment from '../models/Investment.js';
import Loan from '../models/Loan.js';
import Insurance from '../models/Insurance.js';
import mongoose from 'mongoose';

export const getDashboardSummary = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.userId);

        const totalIncome = await Income.aggregate([
            { $match: { userId } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const totalExpense = await Expense.aggregate([
            { $match: { userId } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const totalSavings = await Savings.aggregate([
            { $match: { userId } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const totalInvestment = await Investment.aggregate([
            { $match: { userId } },
            { $group: { 
                _id: null, 
                totalInvested: { $sum: '$amount' },
                totalCurrentValue: { $sum: '$currentValue' }
            } }
        ]);

        const totalLoan = await Loan.aggregate([
            { $match: { userId } },
            { $group: { 
                _id: null, 
                totalAmount: { $sum: '$totalAmount' },
                remainingAmount: { $sum: '$remainingAmount' }
            } }
        ]);

        const totalInsurance = await Insurance.aggregate([
            { $match: { userId } },
            { $group: { 
                _id: null, 
                totalCoverage: { $sum: '$coverageAmount' },
                totalPremium: { $sum: '$premium' }
            } }
        ]);

        const expenseByCategory = await Expense.aggregate([
            { $match: { userId } },
            { $group: { 
                _id: '$category', 
                total: { $sum: '$amount' } 
            } },
            { $sort: { total: -1 } },
            { $limit: 5 }
        ]);

        const incomeBySource = await Income.aggregate([
            { $match: { userId } },
            { $group: { 
                _id: '$source', 
                total: { $sum: '$amount' } 
            } },
            { $sort: { total: -1 } }
        ]);

        res.status(200).json({
            success: true,
            summary: {
                totalIncome: totalIncome[0]?.total || 0,
                totalExpense: totalExpense[0]?.total || 0,
                totalSavings: totalSavings[0]?.total || 0,
                totalInvestment: totalInvestment[0]?.totalInvested || 0,
                totalInvestmentValue: totalInvestment[0]?.totalCurrentValue || 0,
                totalLoanAmount: totalLoan[0]?.totalAmount || 0,
                totalLoanRemaining: totalLoan[0]?.remainingAmount || 0,
                totalInsuranceCoverage: totalInsurance[0]?.totalCoverage || 0,
                totalInsurancePremium: totalInsurance[0]?.totalPremium || 0,
                netBalance: (totalIncome[0]?.total || 0) - (totalExpense[0]?.total || 0),
                expenseByCategory,
                incomeBySource
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error fetching dashboard summary' 
        });
    }
};

export const getMonthlyReport = async (req, res) => {
    try {
        const { month, year } = req.query;
        const userId = new mongoose.Types.ObjectId(req.user.userId);

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const incomes = await Income.find({
            userId,
            date: { $gte: startDate, $lte: endDate }
        });

        const expenses = await Expense.find({
            userId,
            date: { $gte: startDate, $lte: endDate }
        });

        const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
        const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);

        res.status(200).json({
            success: true,
            month,
            year,
            totalIncome,
            totalExpense,
            balance: totalIncome - totalExpense,
            incomeCount: incomes.length,
            expenseCount: expenses.length
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error fetching monthly report' 
        });
    }
};
