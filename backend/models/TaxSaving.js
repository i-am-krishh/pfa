import mongoose from 'mongoose';

const taxSavingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    annualIncome: {
        type: Number,
        required: [true, 'Annual income is required'],
        min: [0, 'Income cannot be negative']
    },
    financialYear: {
        type: String,
        required: true, // e.g., "2024-2025"
        default: () => {
            const today = new Date();
            const year = today.getFullYear();
            if (today.getMonth() < 3) {
                return `${year - 1}-${year}`;
            }
            return `${year}-${year + 1}`;
        }
    },
    taxRegime: {
        type: String,
        enum: ['old_regime', 'new_regime'],
        default: 'old_regime'
    },
    // Tax Saving Investments (Section 80C - Max 1.5 Lakhs)
    taxSavingInvestments: {
        ppf: {
            invested: { type: Number, default: 0 },
            maxLimit: { type: Number, default: 150000 }
        },
        elss: {
            invested: { type: Number, default: 0 },
            maxLimit: { type: Number, default: 150000 }
        },
        nps: {
            invested: { type: Number, default: 0 },
            maxLimit: { type: Number, default: 150000 },
            section: { type: String, default: '80CCD(1)' }
        },
        npsAdditional: {
            invested: { type: Number, default: 0 },
            maxLimit: { type: Number, default: 50000 },
            section: { type: String, default: '80CCD(1B)' }
        },
        lifeInsurance: {
            invested: { type: Number, default: 0 },
            maxLimit: { type: Number, default: 150000 }
        },
        homeLoansInterest: {
            invested: { type: Number, default: 0 },
            maxLimit: { type: Number, default: 200000 },
            section: { type: String, default: '80EE' }
        }
    },
    // Health Insurance (Section 80D)
    healthInsurance: {
        self: { type: Number, default: 0, maxLimit: 25000 },
        familyMembers: { type: Number, default: 0, maxLimit: 25000 },
        parents: { type: Number, default: 0, maxLimit: 25000 },
        parentsAbove60: { type: Number, default: 0, maxLimit: 30000 },
        totalLimit: { type: Number, default: 100000 }
    },
    // Other Deductions
    studentLoanInterest: {
        amount: { type: Number, default: 0 },
        maxLimit: { type: Number, default: 50000 },
        section: { type: String, default: '80E' }
    },
    charityDonations: {
        amount: { type: Number, default: 0 },
        maxLimit: { type: Number, default: null }, // No limit for 80G
        section: { type: String, default: '80G' }
    },
    // Calculated Fields
    totalSection80CDeduction: { type: Number, default: 0 },
    totalSection80DDeduction: { type: Number, default: 0 },
    totalOtherDeductions: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    taxableIncome: { type: Number, default: 0 },
    estimatedTaxLiability: { type: Number, default: 0 },
    estimatedSavings: { type: Number, default: 0 },
    // Recommendations
    recommendations: [{
        type: {
            type: String,
            enum: ['ppf', 'nps', 'elss', 'life_insurance', 'health_insurance', 'student_loan'],
        },
        amount: Number,
        benefit: Number,
        priority: { type: String, enum: ['high', 'medium', 'low'] },
        description: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

export default mongoose.model('TaxSaving', taxSavingSchema);
