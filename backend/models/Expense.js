import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    familyGroupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FamilyGroup',
        default: null
    },
    category: {
        type: String,
        required: [true, 'Please provide expense category'],
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
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'approved'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    },
    rejectionReason: {
        type: String
    },
    familySync: {
        enabled: { type: Boolean, default: false },
        familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'FamilyGroup', default: null },
        visibility: { type: String, enum: ['private', 'family'], default: 'private' }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Expense', expenseSchema);
