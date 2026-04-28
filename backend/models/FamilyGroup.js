import mongoose from 'mongoose';

const familyGroupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a family group name'],
        trim: true
    },
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    familyCode: {
        type: String,
        required: true,
        unique: true
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        role: {
            type: String,
            enum: ['Admin', 'Co-Admin', 'Contributor', 'Expense Member', 'Viewer'],
            default: 'Contributor'
        },
        status: {
            type: String,
            enum: ['Pending', 'Approved', 'Rejected'],
            default: 'Pending'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        monthlyAllowance: {
            type: Number,
            default: 0
        },
        expenseApprovalLimit: {
            type: Number,
            default: 0
        },
        canViewIncome: {
            type: Boolean,
            default: true
        },
        canViewInvestments: {
            type: Boolean,
            default: true
        },
        canViewLoans: {
            type: Boolean,
            default: true
        },
        canViewOtherMembersExpenses: {
            type: Boolean,
            default: true
        },
        shareIncome: {
            type: Boolean,
            default: false
        },
        shareExpenses: {
            type: Boolean,
            default: true
        },
        shareInvestments: {
            type: Boolean,
            default: false
        },
        shareLoans: {
            type: Boolean,
            default: false
        }
    }],
    budgets: [{
        category: {
            type: String,
            required: true
        },
        limit: {
            type: Number,
            required: true
        },
        month: {
            type: String // e.g. "2024-05"
        },
        year: {
            type: Number
        },
        usedAmount: {
            type: Number,
            default: 0
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    goals: [{
        goalName: {
            type: String,
            required: true
        },
        targetAmount: {
            type: Number,
            required: true
        },
        currentAmount: {
            type: Number,
            default: 0
        },
        deadline: {
            type: Date
        },
        status: {
            type: String,
            enum: ['active', 'completed'],
            default: 'active'
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    chatSettings: {
        defaultDisappearTime: {
            type: Number,
            default: null // in milliseconds, null means messages don't disappear
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
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

// Update the updatedAt field on save
familyGroupSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

export default mongoose.model('FamilyGroup', familyGroupSchema);
