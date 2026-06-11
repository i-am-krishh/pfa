import mongoose from 'mongoose';

const transactionRecordSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    familyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FamilyGroup',
        default: null
    },
    statementUploadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StatementUpload',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    amount: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ['income', 'expense'],
        required: true
    },
    category: {
        type: String,
        default: 'Other'
    },
    source: {
        type: String,
        default: 'bank_statement'
    },
    bankName: {
        type: String,
        default: 'Unknown Bank'
    },
    imported: {
        type: Boolean,
        default: false
    },
    isDuplicate: {
        type: Boolean,
        default: false
    },
    aiConfidence: {
        type: Number,
        default: 1.0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Indexing for quick querying and duplicate checks
transactionRecordSchema.index({ userId: 1, statementUploadId: 1 });
transactionRecordSchema.index({ userId: 1, date: 1, amount: 1, description: 1 });

export default mongoose.model('TransactionRecord', transactionRecordSchema);
