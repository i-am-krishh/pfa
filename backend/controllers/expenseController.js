import Expense from '../models/Expense.js';

export const addExpense = async (req, res) => {
    try {
        const { category, amount, description, date, paymentMethod, tags, isRecurring, frequency } = req.body;

        const expense = new Expense({
            userId: req.user.userId,
            category,
            amount,
            description,
            date,
            paymentMethod,
            tags,
            isRecurring,
            frequency
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
