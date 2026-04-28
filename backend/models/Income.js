import mongoose from 'mongoose';

const incomeSchema = new mongoose.Schema({
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
    source: {
        type: String,
        required: [true, 'Please provide income source'],
        enum: ['salary', 'freelance', 'investment', 'bonus', 'gift', 'other'],
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
    category: {
        type: String,
        trim: true
    },
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

export default mongoose.model('Income', incomeSchema);
