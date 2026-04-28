import Expense from '../models/Expense.js';
import FamilyGroup from '../models/FamilyGroup.js';
import Income from '../models/Income.js';
import mongoose from 'mongoose';

export const addExpense = async (req, res) => {
    try {
        const { category, amount, description, date, paymentMethod, tags, isRecurring, frequency, familyGroupId, familySync } = req.body;

        if (familyGroupId) {
            const familyGroup = await FamilyGroup.findById(familyGroupId);
            if (!familyGroup) {
                return res.status(404).json({ success: false, message: 'Family group not found' });
            }
            const isApprovedMember = familyGroup.members.some(m => m.user.toString() === req.user.userId && (m.status === 'Approved' || familyGroup.admin.toString() === req.user.userId));
            if (!isApprovedMember) {
                return res.status(403).json({ success: false, message: 'Not an approved member of this family group' });
            }
        }

        // Check user's current balance (Income - Expenses)
        const userId = new mongoose.Types.ObjectId(req.user.userId);
        const totalIncomeAgg = await Income.aggregate([
            { $match: { userId } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalExpenseAgg = await Expense.aggregate([
            { $match: { userId } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        
        const currentBalance = (totalIncomeAgg[0]?.total || 0) - (totalExpenseAgg[0]?.total || 0);
        
        if (Number(amount) > currentBalance) {
            return res.status(400).json({ 
                success: false, 
                message: `Insufficient balance! Your current balance is ₹${currentBalance.toLocaleString()}, but you're trying to spend ₹${Number(amount).toLocaleString()}.` 
            });
        }

        const expense = new Expense({
            userId: req.user.userId,
            familyGroupId: familyGroupId || null,
            category,
            amount,
            description,
            date,
            paymentMethod,
            tags,
            isRecurring,
            frequency,
            familySync: familySync || { enabled: false }
        });

        await expense.save();

        res.status(201).json({
            success: true,
            message: 'Expense added successfully',
            expense
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error adding expense' 
        });
    }
};

export const getAllExpenses = async (req, res) => {
    try {
        const { startDate, endDate, category } = req.query;
        let query = { userId: req.user.userId };

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        if (category) {
            query.category = category;
        }

        const expenses = await Expense.find(query).sort({ date: -1 });

        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

        res.status(200).json({
            success: true,
            totalExpenses,
            expenseCount: expenses.length,
            expenses
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error fetching expenses' 
        });
    }
};

export const getExpenseById = async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);

        if (!expense || expense.userId.toString() !== req.user.userId.toString()) {
            return res.status(404).json({ 
                success: false, 
                message: 'Expense not found' 
            });
        }

        res.status(200).json({ success: true, expense });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error fetching expense' 
        });
    }
};

export const updateExpense = async (req, res) => {
    try {
        let expense = await Expense.findById(req.params.id);

        if (!expense || expense.userId.toString() !== req.user.userId.toString()) {
            return res.status(404).json({ 
                success: false, 
                message: 'Expense not found' 
            });
        }

        // If amount is being updated, check balance
        if (req.body.amount && Number(req.body.amount) !== expense.amount) {
            const userId = new mongoose.Types.ObjectId(req.user.userId);
            const totalIncomeAgg = await Income.aggregate([
                { $match: { userId } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            const totalExpenseAgg = await Expense.aggregate([
                { $match: { userId } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            
            // Adjust balance by removing the current expense amount from total
            const currentBalance = (totalIncomeAgg[0]?.total || 0) - (totalExpenseAgg[0]?.total || 0) + expense.amount;
            
            if (Number(req.body.amount) > currentBalance) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Insufficient balance! Your available balance (excluding this expense) is ₹${currentBalance.toLocaleString()}, but you're trying to update this expense to ₹${Number(req.body.amount).toLocaleString()}.` 
                });
            }
        }

        expense = await Expense.findByIdAndUpdate(req.params.id, req.body, { 
            new: true, 
            runValidators: true 
        });

        res.status(200).json({
            success: true,
            message: 'Expense updated successfully',
            expense
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error updating expense' 
        });
    }
};

export const deleteExpense = async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);

        if (!expense || expense.userId.toString() !== req.user.userId.toString()) {
            return res.status(404).json({ 
                success: false, 
                message: 'Expense not found' 
            });
        }

        await Expense.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Expense deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error deleting expense' 
        });
    }
};

export const getExpenseByCategory = async (req, res) => {
    try {
        const expenses = await Expense.aggregate([
            { $match: { userId: require('mongoose').Types.ObjectId(req.user.userId) } },
            { $group: { _id: '$category', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
            { $sort: { totalAmount: -1 } }
        ]);

        res.status(200).json({
            success: true,
            expenses
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error fetching expenses by category' 
        });
    }
};

export const getMonthlyExpensesSummary = async (req, res) => {
    try {
        const expenses = await Expense.aggregate([
            { 
                $match: { 
                    userId: require('mongoose').Types.ObjectId(req.user.userId)
                } 
            },
            {
                $group: {
                    _id: {
                        month: { $month: '$date' },
                        year: { $year: '$date' }
                    },
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } }
        ]);

        res.status(200).json({
            success: true,
            expenses
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error fetching monthly expenses summary' 
        });
    }
};
