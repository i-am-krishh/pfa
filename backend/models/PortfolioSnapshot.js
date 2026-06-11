import mongoose from 'mongoose';

const portfolioSnapshotSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Please provide user ID']
    },
    familyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FamilyGroup',
        default: null
    },
    investedAmount: {
        type: Number,
        required: [true, 'Please provide invested amount'],
        min: [0, 'Invested amount cannot be negative']
    },
    currentValue: {
        type: Number,
        required: [true, 'Please provide current value'],
        min: [0, 'Current value cannot be negative']
    },
    totalProfitLoss: {
        type: Number,
        required: [true, 'Please provide total profit/loss']
    },
    profitLossPercentage: {
        type: Number,
        required: [true, 'Please provide profit/loss percentage']
    },
    snapshotDate: {
        type: Date,
        required: [true, 'Please provide snapshot date'],
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field on save
portfolioSnapshotSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Indexes for query performance and sorting by date
portfolioSnapshotSchema.index({ userId: 1, snapshotDate: -1 });
portfolioSnapshotSchema.index({ familyId: 1, snapshotDate: -1 });

export default mongoose.model('PortfolioSnapshot', portfolioSnapshotSchema);
