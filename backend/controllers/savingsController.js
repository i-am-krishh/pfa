import Savings from '../models/Savings.js';

export const addSavings = async (req, res) => {
    try {
        const { accountName, accountType, amount, interestRate, maturityDate, description } = req.body;

        const savings = new Savings({
            userId: req.user.userId,
            accountName,
            accountType,
            amount,
            interestRate,
            maturityDate,
            description
        });

        await savings.save();

        res.status(201).json({
            success: true,
            message: 'Savings account added successfully',
            savings
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error adding savings' 
        });
    }
};

export const getAllSavings = async (req, res) => {
    try {
        const savings = await Savings.find({ userId: req.user.userId });

        const totalSavings = savings.reduce((sum, s) => sum + s.amount, 0);

        res.status(200).json({
            success: true,
            totalSavings,
            savingsCount: savings.length,
            savings
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error fetching savings' 
        });
    }
};

export const getSavingsById = async (req, res) => {
    try {
        const savings = await Savings.findById(req.params.id);

        if (!savings || savings.userId.toString() !== req.user.userId.toString()) {
            return res.status(404).json({ 
                success: false, 
                message: 'Savings account not found' 
            });
        }

        res.status(200).json({ success: true, savings });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error fetching savings' 
        });
    }
};

export const updateSavings = async (req, res) => {
    try {
        let savings = await Savings.findById(req.params.id);

        if (!savings || savings.userId.toString() !== req.user.userId.toString()) {
            return res.status(404).json({ 
                success: false, 
                message: 'Savings account not found' 
            });
        }

        savings = await Savings.findByIdAndUpdate(req.params.id, 
            { ...req.body, updatedAt: Date.now() }, 
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Savings updated successfully',
            savings
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error updating savings' 
        });
    }
};

export const deleteSavings = async (req, res) => {
    try {
        const savings = await Savings.findById(req.params.id);

        if (!savings || savings.userId.toString() !== req.user.userId.toString()) {
            return res.status(404).json({ 
                success: false, 
                message: 'Savings account not found' 
            });
        }

        await Savings.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Savings deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error deleting savings' 
        });
    }
};
