import mongoose from 'mongoose';

const statementUploadSchema = new mongoose.Schema({
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
    fileName: {
        type: String,
        required: true
    },
    fileType: {
        type: String,
        required: true
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    processingStatus: {
        type: String,
        enum: ['pending', 'parsed', 'imported', 'failed'],
        default: 'pending'
    },
    totalTransactions: {
        type: Number,
        default: 0
    },
    extractedTransactions: {
        type: Number,
        default: 0
    },
    documentType: {
        type: String,
        default: 'pdf'
    },
    extractionMethod: {
        type: String,
        default: 'pdf_text'
    },
    bankDetected: {
        type: String,
        default: 'Unknown Bank'
    },
    ocrConfidence: {
        type: Number,
        default: 1.0
    },
    errors: {
        type: [String],
        default: []
    }
});

export default mongoose.model('StatementUpload', statementUploadSchema);
