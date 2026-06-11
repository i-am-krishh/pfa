import mongoose from 'mongoose';

const familyWelfareProfileSchema = new mongoose.Schema({
    familyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FamilyGroup',
        required: true,
        unique: true
    },
    annualFamilyIncome: {
        type: Number,
        default: 0,
        min: 0
    },
    familySize: {
        type: Number,
        default: 1,
        min: 1
    },
    state: {
        type: String,
        required: true,
        trim: true
    },
    memberAges: {
        type: [Number],
        default: []
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other', 'mixed'],
        default: 'mixed'
    },
    occupation: {
        type: String,
        default: 'salaried',
        trim: true
    },
    isStudent: {
        type: Boolean,
        default: false
    },
    isFarmer: {
        type: Boolean,
        default: false
    },
    isDisabled: {
        type: Boolean,
        default: false
    },
    isSeniorCitizen: {
        type: Boolean,
        default: false
    },
    ownsHome: {
        type: Boolean,
        default: true
    },
    appliedSchemes: [{
        schemeId: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ['Eligible', 'Applied', 'Approved', 'Rejected'],
            default: 'Eligible'
        },
        appliedDate: {
            type: Date,
            default: Date.now
        }
    }],
    recommendations: {
        type: mongoose.Schema.Types.Mixed,
        default: []
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

familyWelfareProfileSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

export default mongoose.model('FamilyWelfareProfile', familyWelfareProfileSchema);
