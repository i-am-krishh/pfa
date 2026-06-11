import Investment from '../models/Investment.js';
import FamilyGroup from '../models/FamilyGroup.js';
import mongoose from 'mongoose';
import * as yahooFinanceService from '../services/yahooFinanceService.js';

export const addInvestment = async (req, res) => {
    try {
        const { type, name, symbol, amount, currentValue, quantity, pricePerUnit, investmentDate, expectedReturnPercentage, riskLevel, broker, description, familyGroupId, familySync, fetchedStockPrice } = req.body;

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

        let calculatedCurrentValue = currentValue;
        let finalFetchedStockPrice = fetchedStockPrice || 0;
        let finalSymbol = symbol || '';
        let finalName = name;

        if (type === 'stocks') {
            const cleanSymbol = symbol || name;
            if (cleanSymbol) {
                try {
                    const quote = await yahooFinanceService.getStockQuote(cleanSymbol);
                    if (quote) {
                        finalFetchedStockPrice = quote.currentPrice;
                        calculatedCurrentValue = (parseFloat(quantity) || 1) * finalFetchedStockPrice;
                        finalSymbol = quote.symbol;
                        finalName = quote.companyName;
                    }
                } catch (error) {
                    console.error('[addInvestment] Yahoo Finance API fail:', error.message);
                    if (!finalFetchedStockPrice && !currentValue) {
                        return res.status(500).json({ success: false, message: 'Live Price Unavailable' });
                    }
                }
            }
        }

        // Auto-calculate amount if not provided
        let finalAmount = amount;
        if (type === 'stocks' && (!finalAmount || finalAmount === 0)) {
            finalAmount = (parseFloat(quantity) || 1) * (parseFloat(pricePerUnit) || 0);
        }

        const investment = new Investment({
            userId: req.user.userId,
            familyGroupId: familyGroupId || null,
            type,
            name: finalName,
            symbol: finalSymbol,
            amount: finalAmount,
            currentValue: calculatedCurrentValue,
            quantity,
            pricePerUnit,
            fetchedStockPrice: finalFetchedStockPrice,
            investmentDate,
            expectedReturnPercentage,
            riskLevel,
            broker,
            description,
            familySync: familySync || { enabled: false }
        });

        await investment.save();

        res.status(201).json({
            success: true,
            message: 'Investment added successfully',
            investment
        });
    } catch (error) {
        const isDev = process.env.NODE_ENV === 'development';
        res.status(500).json({ 
            success: false, 
            message: isDev ? error.message : 'Error adding investment' 
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
        const isDev = process.env.NODE_ENV === 'development';
        res.status(500).json({ 
            success: false, 
            message: isDev ? error.message : 'Error fetching investments' 
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
        const isDev = process.env.NODE_ENV === 'development';
        res.status(500).json({ 
            success: false, 
            message: isDev ? error.message : 'Error fetching investment' 
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

        const updateData = { ...req.body };

        if (updateData.type === 'stocks') {
            const cleanSymbol = updateData.symbol || updateData.name || investment.symbol || investment.name;
            const cleanQuantity = updateData.quantity !== undefined ? parseFloat(updateData.quantity) : investment.quantity;
            const cleanPricePerUnit = updateData.pricePerUnit !== undefined ? parseFloat(updateData.pricePerUnit) : investment.pricePerUnit;

            try {
                const quote = await yahooFinanceService.getStockQuote(cleanSymbol);
                if (quote) {
                    updateData.fetchedStockPrice = quote.currentPrice;
                    updateData.currentValue = cleanQuantity * quote.currentPrice;
                    updateData.symbol = quote.symbol;
                    updateData.name = quote.companyName;
                }
            } catch (error) {
                console.error('[updateInvestment] Yahoo Finance API fail:', error.message);
                if (updateData.fetchedStockPrice === undefined) {
                    updateData.fetchedStockPrice = investment.fetchedStockPrice || 0;
                }
                if (updateData.currentValue === undefined) {
                    updateData.currentValue = cleanQuantity * (updateData.fetchedStockPrice || investment.fetchedStockPrice || 0);
                }
            }

            // Auto-calculate amount if not provided
            if (updateData.amount === undefined || updateData.amount === 0) {
                updateData.amount = cleanQuantity * cleanPricePerUnit;
            }
        }

        investment = await Investment.findByIdAndUpdate(req.params.id, 
            { ...updateData, updatedAt: Date.now() }, 
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Investment updated successfully',
            investment
        });
    } catch (error) {
        const isDev = process.env.NODE_ENV === 'development';
        res.status(500).json({ 
            success: false, 
            message: isDev ? error.message : 'Error updating investment' 
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
        const isDev = process.env.NODE_ENV === 'development';
        res.status(500).json({ 
            success: false, 
            message: isDev ? error.message : 'Error deleting investment' 
        });
    }
};

export const getInvestmentByType = async (req, res) => {
    try {
        const investments = await Investment.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(req.user.userId) } },
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
        const isDev = process.env.NODE_ENV === 'development';
        res.status(500).json({ 
            success: false, 
            message: isDev ? error.message : 'Error fetching investments by type' 
        });
    }
};
