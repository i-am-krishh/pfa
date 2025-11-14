import Income from '../models/Income.js';

export const addIncome = async (req, res) => {
    try {
        const { source, amount, description, date, category, isRecurring, frequency } = req.body;

        const income = new Income({
            userId: req.user.userId,
            source,
            amount,
            description,
            date,
            category,
            isRecurring,
            frequency
        });

        await income.save();

        res.status(201).json({
            success: true,
            message: 'Income added successfully',
            income
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error adding income' 
        });
    }
};

export const getAllIncomes = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = { userId: req.user.userId };

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const incomes = await Income.find(query).sort({ date: -1 });

        const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);

        res.status(200).json({
            success: true,
            totalIncome,
            incomeCount: incomes.length,
            incomes
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error fetching incomes' 
        });
    }
};

export const getIncomeById = async (req, res) => {
    try {
        const income = await Income.findById(req.params.id);

        if (!income || income.userId.toString() !== req.user.userId.toString()) {
            return res.status(404).json({ 
                success: false, 
                message: 'Income not found' 
            });
        }

        res.status(200).json({ success: true, income });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error fetching income' 
        });
    }
};

export const updateIncome = async (req, res) => {
    try {
        let income = await Income.findById(req.params.id);

        if (!income || income.userId.toString() !== req.user.userId.toString()) {
            return res.status(404).json({ 
                success: false, 
                message: 'Income not found' 
            });
        }

        income = await Income.findByIdAndUpdate(req.params.id, req.body, { 
            new: true, 
            runValidators: true 
        });

        res.status(200).json({
            success: true,
            message: 'Income updated successfully',
            income
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error updating income' 
        });
    }
};

export const deleteIncome = async (req, res) => {
    try {
        const income = await Income.findById(req.params.id);

        if (!income || income.userId.toString() !== req.user.userId.toString()) {
            return res.status(404).json({ 
                success: false, 
                message: 'Income not found' 
            });
        }

        await Income.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Income deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error deleting income' 
        });
    }
};

export const getIncomeBySource = async (req, res) => {
    try {
        const incomes = await Income.aggregate([
            { $match: { userId: require('mongoose').Types.ObjectId(req.user.userId) } },
            { $group: { _id: '$source', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
            { $sort: { totalAmount: -1 } }
        ]);

        res.status(200).json({
            success: true,
            incomes
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error fetching income by source' 
        });
    }
};
