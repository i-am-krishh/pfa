import mongoose from 'mongoose';

const savingsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    accountName: {
        type: String,
        required: [true, 'Please provide account name'],
        trim: true
    },
    accountType: {
        type: String,
        enum: ['savings_account', 'fixed_deposit', 'recurring_deposit', 'cash', 'other'],
        required: true
    },
    amount: {
        type: Number,
        required: [true, 'Please provide amount'],
        min: [0, 'Amount cannot be negative']
    },
    interestRate: {
        type: Number,
        default: 0,
        min: [0, 'Interest rate cannot be negative']
    },
    maturityDate: {
        type: Date
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

export default mongoose.model('Savings', savingsSchema);
