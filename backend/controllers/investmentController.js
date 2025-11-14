import Investment from '../models/Investment.js';

export const addInvestment = async (req, res) => {
    try {
        const { type, name, amount, currentValue, quantity, pricePerUnit, investmentDate, expectedReturnPercentage, riskLevel, broker, description } = req.body;

        const investment = new Investment({
            userId: req.user.userId,
            type,
            name,
            amount,
            currentValue,
            quantity,
            pricePerUnit,
            investmentDate,
            expectedReturnPercentage,
            riskLevel,
            broker,
            description
        });

        await investment.save();

        res.status(201).json({
            success: true,
            message: 'Investment added successfully',
            investment
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error adding investment' 
        });
    }
};

export const getAllInvestments = async (req, res) => {
    try {
        const investments = await Investment.find({ userId: req.user.userId });

        const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
        const totalCurrentValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);

        res.status(200).json({
            success: true,
            totalInvested,
            totalCurrentValue,
            investmentCount: investments.length,
            investments
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error fetching investments' 
        });
    }
};

export const getInvestmentById = async (req, res) => {
    try {
        const investment = await Investment.findById(req.params.id);

        if (!investment || investment.userId.toString() !== req.user.userId.toString()) {
            return res.status(404).json({ 
                success: false, 
                message: 'Investment not found' 
            });
        }

        res.status(200).json({ success: true, investment });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error fetching investment' 
        });
    }
};

export const updateInvestment = async (req, res) => {
    try {
        let investment = await Investment.findById(req.params.id);

        if (!investment || investment.userId.toString() !== req.user.userId.toString()) {
            return res.status(404).json({ 
                success: false, 
                message: 'Investment not found' 
            });
        }

        investment = await Investment.findByIdAndUpdate(req.params.id, 
            { ...req.body, updatedAt: Date.now() }, 
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Investment updated successfully',
            investment
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error updating investment' 
        });
    }
};

export const deleteInvestment = async (req, res) => {
    try {
        const investment = await Investment.findById(req.params.id);

        if (!investment || investment.userId.toString() !== req.user.userId.toString()) {
            return res.status(404).json({ 
                success: false, 
                message: 'Investment not found' 
            });
        }

        await Investment.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Investment deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error deleting investment' 
        });
    }
};

export const getInvestmentByType = async (req, res) => {
    try {
        const investments = await Investment.aggregate([
            { $match: { userId: require('mongoose').Types.ObjectId(req.user.userId) } },
            { $group: { 
                _id: '$type', 
                totalAmount: { $sum: '$amount' },
                totalCurrentValue: { $sum: '$currentValue' },
                count: { $sum: 1 } 
            } },
            { $sort: { totalAmount: -1 } }
        ]);

        res.status(200).json({
            success: true,
            investments
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error fetching investments by type' 
        });
    }
};
