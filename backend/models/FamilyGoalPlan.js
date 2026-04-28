import mongoose from 'mongoose';

const familyGoalPlanSchema = new mongoose.Schema({
    familyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FamilyGroup',
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    goalType: {
        type: String,
        enum: ['house', 'car', 'education', 'emergency_fund', 'travel', 'retirement', 'wedding', 'business', 'other'],
        required: true
    },
    goalName: {
        type: String,
        required: true,
        trim: true
    },
    targetAmount: {
        type: Number,
        required: true,
        min: 0
    },
    currentSavedAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    deadlineMonths: {
        type: Number,
        required: true,
        min: 1
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    monthlyRequiredSaving: Number,
    monthlyCurrentSurplus: Number,
    monthlyShortfall: Number,
    savingsRate: Number,
    emiToIncomeRatio: Number,
    feasibilityScore: Number,
    status: {
        type: String,
        enum: ['achievable', 'difficult', 'unlikely', 'on_track'],
        default: 'achievable'
    },
    aiSuggestion: {
        summary: String,
        isAchievable: String,
        monthlyPlan: String,
        expenseReduction: String,
        riskWarnings: String,
        investmentGuidance: String,
        alternativeTimeline: String,
        fullResponse: String // Store the raw AI response for reference
    },
    roadmap: [{
        step: Number,
        title: String,
        description: String,
        targetDate: Date
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

familyGoalPlanSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

export default mongoose.model('FamilyGoalPlan', familyGoalPlanSchema);
