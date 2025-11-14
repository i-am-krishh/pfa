import Insurance from '../models/Insurance.js';

export const addInsurance = async (req, res) => {
    try {
        const { type, providerName, policyNumber, coverageAmount, premium, premiumFrequency, startDate, endDate, status, nominee, description } = req.body;

        const insurance = new Insurance({
            userId: req.user.userId,
            type,
            providerName,
            policyNumber,
            coverageAmount,
            premium,
            premiumFrequency,
            startDate,
            endDate,
            status,
            nominee,
            description
        });

        await insurance.save();

        res.status(201).json({
            success: true,
            message: 'Insurance policy added successfully',
            insurance
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error adding insurance' 
        });
    }
};

export const getAllInsurances = async (req, res) => {
    try {
        const insurances = await Insurance.find({ userId: req.user.userId });

        const totalCoverageAmount = insurances.reduce((sum, ins) => sum + ins.coverageAmount, 0);
        const totalPremium = insurances.reduce((sum, ins) => sum + ins.premium, 0);

        res.status(200).json({
            success: true,
            totalCoverageAmount,
            totalPremium,
            insuranceCount: insurances.length,
            insurances
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error fetching insurances' 
        });
    }
};

export const getInsuranceById = async (req, res) => {
    try {
        const insurance = await Insurance.findById(req.params.id);

        if (!insurance || insurance.userId.toString() !== req.user.userId.toString()) {
            return res.status(404).json({ 
                success: false, 
                message: 'Insurance not found' 
            });
        }

        res.status(200).json({ success: true, insurance });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error fetching insurance' 
        });
    }
};

export const updateInsurance = async (req, res) => {
    try {
        let insurance = await Insurance.findById(req.params.id);

        if (!insurance || insurance.userId.toString() !== req.user.userId.toString()) {
            return res.status(404).json({ 
                success: false, 
                message: 'Insurance not found' 
            });
        }

        insurance = await Insurance.findByIdAndUpdate(req.params.id, 
            { ...req.body, updatedAt: Date.now() }, 
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Insurance updated successfully',
            insurance
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error updating insurance' 
        });
    }
};

export const deleteInsurance = async (req, res) => {
    try {
        const insurance = await Insurance.findById(req.params.id);

        if (!insurance || insurance.userId.toString() !== req.user.userId.toString()) {
            return res.status(404).json({ 
                success: false, 
                message: 'Insurance not found' 
            });
        }

        await Insurance.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Insurance deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error deleting insurance' 
        });
    }
};
