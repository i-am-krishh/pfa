import mongoose from 'mongoose';

const insuranceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['health', 'life', 'home', 'auto', 'travel', 'other'],
        required: [true, 'Please provide insurance type']
    },
    providerName: {
        type: String,
        required: [true, 'Please provide provider name'],
        trim: true
    },
    policyNumber: {
        type: String,
        required: [true, 'Please provide policy number'],
        trim: true
    },
    coverageAmount: {
        type: Number,
        required: [true, 'Please provide coverage amount'],
        min: [0, 'Amount cannot be negative']
    },
    premium: {
        type: Number,
        required: [true, 'Please provide premium'],
        min: [0, 'Premium cannot be negative']
    },
    premiumFrequency: {
        type: String,
        enum: ['monthly', 'quarterly', 'half_yearly', 'yearly'],
        default: 'yearly'
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    nextPremiumDueDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'expired', 'lapsed'],
        default: 'active'
    },
    nominee: {
        name: String,
        relationship: String
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

export default mongoose.model('Insurance', insuranceSchema);
