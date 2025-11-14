import TaxSaving from '../models/TaxSaving.js';

// Calculate tax based on income slabs (Old Regime - India FY 2024-25)
const calculateTax = (income) => {
    if (income <= 250000) return 0;
    if (income <= 500000) return (income - 250000) * 0.05;
    if (income <= 1000000) return 12500 + (income - 500000) * 0.20;
    return 112500 + (income - 1000000) * 0.30;
};

// Calculate recommended investments based on remaining limit
const generateRecommendations = (income, deductions) => {
    const recommendations = [];
    const remainingFor80C = Math.max(0, 150000 - deductions.section80C);
    const remainingFor80D = Math.max(0, 100000 - deductions.section80D);
    
    // PPF Recommendation
    if (remainingFor80C >= 50000) {
        recommendations.push({
            type: 'ppf',
            amount: Math.min(50000, remainingFor80C),
            benefit: Math.min(50000, remainingFor80C) * 0.12, // 12% annual return
            priority: 'high',
            description: 'Public Provident Fund - Safe, locked for 15 years with guaranteed returns'
        });
    }

    // ELSS Recommendation
    if (remainingFor80C >= 50000) {
        recommendations.push({
            type: 'elss',
            amount: Math.min(50000, remainingFor80C),
            benefit: Math.min(50000, remainingFor80C) * 0.15, // 15% expected annual return
            priority: 'high',
            description: 'Equity Linked Savings Scheme - Tax benefits with market-linked growth'
        });
    }

    // NPS Recommendation
    if (remainingFor80C >= 30000) {
        recommendations.push({
            type: 'nps',
            amount: Math.min(50000, remainingFor80C),
            benefit: Math.min(50000, remainingFor80C) * 0.10,
            priority: 'medium',
            description: 'National Pension Scheme - Retirement planning with tax benefits'
        });
    }

    // Life Insurance Recommendation
    if (remainingFor80C >= 30000) {
        recommendations.push({
            type: 'life_insurance',
            amount: Math.min(30000, remainingFor80C),
            benefit: Math.min(30000, remainingFor80C) * 0.05,
            priority: 'medium',
            description: 'Life Insurance Premium - Financial security for family'
        });
    }

    // Health Insurance Recommendation
    if (remainingFor80D >= 25000) {
        recommendations.push({
            type: 'health_insurance',
            amount: Math.min(25000, remainingFor80D),
            benefit: Math.min(25000, remainingFor80D) * 0.0625, // 6.25% tax saving at 25% slab
            priority: 'high',
            description: 'Health Insurance Premium - Medical emergency protection'
        });
    }

    return recommendations;
};

// Add or Update Tax Saving Details
export const saveTaxDetails = async (req, res) => {
    try {
        const { annualIncome, taxRegime, taxSavingInvestments, healthInsurance, studentLoanInterest, charityDonations } = req.body;

        // Calculate deductions
        const section80C = 
            (taxSavingInvestments?.ppf?.invested || 0) +
            (taxSavingInvestments?.elss?.invested || 0) +
            (taxSavingInvestments?.nps?.invested || 0) +
            (taxSavingInvestments?.lifeInsurance?.invested || 0) +
            (taxSavingInvestments?.homeLoansInterest?.invested || 0);

        const section80D = 
            (healthInsurance?.self || 0) +
            (healthInsurance?.familyMembers || 0) +
            (healthInsurance?.parents || 0) +
            (healthInsurance?.parentsAbove60 || 0);

        const npsAdditional = taxSavingInvestments?.npsAdditional?.invested || 0;
        const studentLoan = studentLoanInterest?.amount || 0;
        const charity = charityDonations?.amount || 0;

        const totalSection80CDeduction = Math.min(section80C, 150000);
        const totalSection80DDeduction = Math.min(section80D, 100000);
        const totalOtherDeductions = Math.min(npsAdditional, 50000) + studentLoan + charity;
        const totalDeductions = totalSection80CDeduction + totalSection80DDeduction + totalOtherDeductions;

        let taxableIncome = annualIncome - totalDeductions;
        if (taxableIncome < 0) taxableIncome = 0;

        const estimatedTaxLiability = calculateTax(taxableIncome);
        const estimatedSavings = calculateTax(annualIncome) - estimatedTaxLiability;

        // Generate recommendations
        const recommendations = generateRecommendations(annualIncome, {
            section80C: totalSection80CDeduction,
            section80D: totalSection80DDeduction
        });

        // Get financial year
        const today = new Date();
        const year = today.getFullYear();
        const financialYear = today.getMonth() < 3 ? `${year - 1}-${year}` : `${year}-${year + 1}`;

        let taxSaving = await TaxSaving.findOne({ userId: req.user.userId, financialYear });

        if (taxSaving) {
            // Update existing
            taxSaving.annualIncome = annualIncome;
            taxSaving.taxRegime = taxRegime;
            taxSaving.taxSavingInvestments = taxSavingInvestments;
            taxSaving.healthInsurance = healthInsurance;
            taxSaving.studentLoanInterest = studentLoanInterest;
            taxSaving.charityDonations = charityDonations;
            taxSaving.totalSection80CDeduction = totalSection80CDeduction;
            taxSaving.totalSection80DDeduction = totalSection80DDeduction;
            taxSaving.totalOtherDeductions = totalOtherDeductions;
            taxSaving.totalDeductions = totalDeductions;
            taxSaving.taxableIncome = taxableIncome;
            taxSaving.estimatedTaxLiability = estimatedTaxLiability;
            taxSaving.estimatedSavings = estimatedSavings;
            taxSaving.recommendations = recommendations;
        } else {
            // Create new
            taxSaving = new TaxSaving({
                userId: req.user.userId,
                annualIncome,
                financialYear,
                taxRegime,
                taxSavingInvestments,
                healthInsurance,
                studentLoanInterest,
                charityDonations,
                totalSection80CDeduction,
                totalSection80DDeduction,
                totalOtherDeductions,
                totalDeductions,
                taxableIncome,
                estimatedTaxLiability,
                estimatedSavings,
                recommendations
            });
        }

        await taxSaving.save();

        res.status(201).json({
            success: true,
            message: 'Tax details saved successfully',
            taxSaving
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error saving tax details'
        });
    }
};

// Get Tax Saving Details
export const getTaxDetails = async (req, res) => {
    try {
        const { financialYear } = req.query;

        let query = { userId: req.user.userId };

        if (financialYear) {
            query.financialYear = financialYear;
        } else {
            // Get current financial year by default
            const today = new Date();
            const year = today.getFullYear();
            query.financialYear = today.getMonth() < 3 ? `${year - 1}-${year}` : `${year}-${year + 1}`;
        }

        const taxSaving = await TaxSaving.findOne(query);

        if (!taxSaving) {
            return res.status(404).json({
                success: false,
                message: 'Tax saving details not found'
            });
        }

        res.status(200).json({
            success: true,
            taxSaving
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error fetching tax details'
        });
    }
};

// Get all Tax Saving records for user
export const getAllTaxRecords = async (req, res) => {
    try {
        const taxRecords = await TaxSaving.find({ userId: req.user.userId }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: taxRecords.length,
            taxRecords
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error fetching tax records'
        });
    }
};

// Delete Tax Record
export const deleteTaxRecord = async (req, res) => {
    try {
        const { id } = req.params;

        const taxSaving = await TaxSaving.findByIdAndDelete(id);

        if (!taxSaving) {
            return res.status(404).json({
                success: false,
                message: 'Tax record not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Tax record deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error deleting tax record'
        });
    }
};

// Generate ITR Summary Report
export const generateITRSummary = async (req, res) => {
    try {
        const { financialYear } = req.query;

        let query = { userId: req.user.userId };

        if (financialYear) {
            query.financialYear = financialYear;
        }

        const taxSaving = await TaxSaving.findOne(query);

        if (!taxSaving) {
            return res.status(404).json({
                success: false,
                message: 'Tax saving details not found'
            });
        }

        // Generate ITR-ready summary
        const itrSummary = {
            financialYear: taxSaving.financialYear,
            userId: req.user.userId,
            grossIncome: taxSaving.annualIncome,
            deductions: {
                section80C: {
                    ppf: taxSaving.taxSavingInvestments.ppf.invested,
                    elss: taxSaving.taxSavingInvestments.elss.invested,
                    nps: taxSaving.taxSavingInvestments.nps.invested,
                    lifeInsurance: taxSaving.taxSavingInvestments.lifeInsurance.invested,
                    homeLoansInterest: taxSaving.taxSavingInvestments.homeLoansInterest.invested,
                    total: taxSaving.totalSection80CDeduction
                },
                section80D: {
                    healthInsurance: taxSaving.totalSection80DDeduction,
                    limit: 100000
                },
                section80CCD1B: {
                    nps: taxSaving.taxSavingInvestments.npsAdditional.invested,
                    limit: 50000
                },
                section80E: {
                    studentLoanInterest: taxSaving.studentLoanInterest.amount,
                    limit: 50000
                },
                section80G: {
                    charityDonations: taxSaving.charityDonations.amount
                },
                totalDeductions: taxSaving.totalDeductions
            },
            taxableIncome: taxSaving.taxableIncome,
            estimatedTaxLiability: taxSaving.estimatedTaxLiability,
            estimatedSavings: taxSaving.estimatedSavings,
            generatedAt: new Date().toISOString()
        };

        res.status(200).json({
            success: true,
            itrSummary
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error generating ITR summary'
        });
    }
};
