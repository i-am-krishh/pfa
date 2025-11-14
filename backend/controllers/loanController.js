import Loan from '../models/Loan.js';

export const addLoan = async (req, res) => {
    try {
        const { type, lenderName, totalAmount, remainingAmount, rateOfInterest, tenure, tenureUnit, monthlyEMI, startDate, endDate, description } = req.body;

        const loan = new Loan({
            userId: req.user.userId,
            type,
            lenderName,
            totalAmount,
            remainingAmount,
            rateOfInterest,
            tenure,
            tenureUnit,
            monthlyEMI,
            startDate,
            endDate,
            description
        });

        await loan.save();

        res.status(201).json({
            success: true,
            message: 'Loan added successfully',
            loan
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error adding loan' 
        });
    }
};

export const getAllLoans = async (req, res) => {
    try {
        const loans = await Loan.find({ userId: req.user.userId });

        const totalLoanAmount = loans.reduce((sum, loan) => sum + loan.totalAmount, 0);
        const totalRemainingAmount = loans.reduce((sum, loan) => sum + loan.remainingAmount, 0);
        const totalEMI = loans.reduce((sum, loan) => sum + loan.monthlyEMI, 0);

        res.status(200).json({
            success: true,
            totalLoanAmount,
            totalRemainingAmount,
            totalEMI,
            loanCount: loans.length,
            loans
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error fetching loans' 
        });
    }
};

export const getLoanById = async (req, res) => {
    try {
        const loan = await Loan.findById(req.params.id);

        if (!loan || loan.userId.toString() !== req.user.userId.toString()) {
            return res.status(404).json({ 
                success: false, 
                message: 'Loan not found' 
            });
        }

        res.status(200).json({ success: true, loan });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error fetching loan' 
        });
    }
};

export const updateLoan = async (req, res) => {
    try {
        let loan = await Loan.findById(req.params.id);

        if (!loan || loan.userId.toString() !== req.user.userId.toString()) {
            return res.status(404).json({ 
                success: false, 
                message: 'Loan not found' 
            });
        }

        loan = await Loan.findByIdAndUpdate(req.params.id, 
            { ...req.body, updatedAt: Date.now() }, 
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Loan updated successfully',
            loan
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error updating loan' 
        });
    }
};

export const deleteLoan = async (req, res) => {
    try {
        const loan = await Loan.findById(req.params.id);

        if (!loan || loan.userId.toString() !== req.user.userId.toString()) {
            return res.status(404).json({ 
                success: false, 
                message: 'Loan not found' 
            });
        }

        await Loan.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Loan deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error deleting loan' 
        });
    }
};
