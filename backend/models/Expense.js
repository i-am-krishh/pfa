import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    category: {
        type: String,
        required: [true, 'Please provide expense category'],
        enum: ['food', 'transport', 'utilities', 'entertainment', 'shopping', 'healthcare', 'education', 'insurance', 'rent', 'other'],
        trim: true
    },
    amount: {
        type: Number,
        required: [true, 'Please provide amount'],
        min: [0, 'Amount cannot be negative']
    },
    description: {
        type: String,
        trim: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'upi', 'other'],
        default: 'cash'
    },
    tags: [String],
    isRecurring: {
        type: Boolean,
        default: false
    },
    frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'yearly', null],
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Expense', expenseSchema);
