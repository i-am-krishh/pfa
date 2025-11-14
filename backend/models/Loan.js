import mongoose from 'mongoose';

const loanSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['personal_loan', 'home_loan', 'car_loan', 'education_loan', 'credit_card', 'other'],
        required: [true, 'Please provide loan type']
    },
    lenderName: {
        type: String,
        required: [true, 'Please provide lender name'],
        trim: true
    },
    totalAmount: {
        type: Number,
        required: [true, 'Please provide total amount'],
        min: [0, 'Amount cannot be negative']
    },
    remainingAmount: {
        type: Number,
        required: true,
        min: [0, 'Remaining amount cannot be negative']
    },
    rateOfInterest: {
        type: Number,
        required: true,
        min: [0, 'Interest rate cannot be negative']
    },
    tenure: {
        type: Number,
        required: true
    },
    tenureUnit: {
        type: String,
        enum: ['months', 'years'],
        default: 'months'
    },
    monthlyEMI: {
        type: Number,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    amountPaid: {
        type: Number,
        default: 0,
        min: [0, 'Amount paid cannot be negative']
    },
    nextPaymentDate: {
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

export default mongoose.model('Loan', loanSchema);
