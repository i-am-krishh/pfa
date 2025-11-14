import mongoose from 'mongoose';

const investmentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['stocks', 'mutual_funds', 'crypto', 'bonds', 'real_estate', 'other'],
        required: [true, 'Please provide investment type']
    },
    name: {
        type: String,
        required: [true, 'Please provide investment name'],
        trim: true
    },
    amount: {
        type: Number,
        required: [true, 'Please provide amount'],
        min: [0, 'Amount cannot be negative']
    },
    currentValue: {
        type: Number,
        default: 0,
        min: [0, 'Current value cannot be negative']
    },
    quantity: {
        type: Number,
        default: 1
    },
    pricePerUnit: {
        type: Number,
        default: 0
    },
    investmentDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    expectedReturnPercentage: {
        type: Number,
        default: 0
    },
    riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    broker: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true
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

export default mongoose.model('Investment', investmentSchema);
