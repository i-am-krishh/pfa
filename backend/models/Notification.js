import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        default: 'loan_emi'
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    data: {
        loanId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Loan'
        },
        emiAmount: {
            type: Number
        },
        monthStr: {
            type: String // format: 'YYYY-MM'
        }
    },
    isRead: {
        type: Boolean,
        default: false
    },
    actionStatus: {
        type: String,
        enum: ['pending', 'paid', 'skipped'],
        default: 'pending'
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

export default mongoose.model('Notification', notificationSchema);
