import FamilyGroup from '../models/FamilyGroup.js';
import Expense from '../models/Expense.js';

// Add a goal
export const addFamilyGoal = async (req, res) => {
    try {
        const { goalName, targetAmount, deadline } = req.body;
        
        if (!goalName || !targetAmount) {
            return res.status(400).json({ success: false, message: 'Goal name and target amount are required' });
        }
        
        const familyGroup = req.family; // from isApprovedMember / isFamilyAdmin middleware

        const newGoal = {
            goalName,
            targetAmount,
            currentAmount: 0,
            deadline,
            status: 'active',
            createdBy: req.user.userId
        };

        familyGroup.goals.push(newGoal);
        await familyGroup.save();

        res.status(201).json({ success: true, message: 'Goal created', data: familyGroup.goals });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get goals with computed stats
export const getFamilyGoals = async (req, res) => {
    try {
        const familyGroup = req.family; // from isApprovedMember middleware

        const goalsWithStats = familyGroup.goals.map(goal => {
            const progressPercentage = goal.targetAmount > 0 
                ? (goal.currentAmount / goal.targetAmount) * 100 
                : 0;
            const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
            
            let estimatedStatus = 'on-track';
            if (goal.status === 'completed' || remainingAmount === 0) {
                estimatedStatus = 'completed';
            } else if (goal.deadline && new Date() > new Date(goal.deadline)) {
                estimatedStatus = 'overdue';
            }

            return {
                ...goal.toObject(),
                progressPercentage: progressPercentage.toFixed(2),
                remainingAmount,
                estimatedStatus
            };
        });

        res.status(200).json({ success: true, data: goalsWithStats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Contribute to a goal
export const contributeToGoal = async (req, res) => {
    try {
        const { familyId, goalId } = req.params;
        const { amount } = req.body; // contribution amount
        
        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Valid contribution amount is required' });
        }
        
        const familyGroup = req.family;

        const goal = familyGroup.goals.id(goalId);
        if (!goal) {
            return res.status(404).json({ success: false, message: 'Goal not found' });
        }

        goal.currentAmount += Number(amount);
        
        if (goal.currentAmount >= goal.targetAmount) {
            goal.status = 'completed';
        }

        await familyGroup.save();

        // Create an Expense record for the member
        await Expense.create({
            userId: req.user.userId,
            familyGroupId: familyId,
            category: 'Goal Contribution',
            amount: Number(amount),
            description: `Contribution to family goal: ${goal.goalName}`,
            date: new Date(),
            paymentMethod: 'other',
            status: 'approved',
            familySync: {
                enabled: true,
                familyId: familyId,
                visibility: 'family'
            }
        });

        res.status(200).json({ success: true, message: 'Contribution added and logged as expense', data: familyGroup.goals });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update a goal
export const updateFamilyGoal = async (req, res) => {
    try {
        const { goalId } = req.params;
        const { goalName, targetAmount, deadline, status } = req.body;
        const familyGroup = req.family;
        const userId = req.user.userId;

        const goal = familyGroup.goals.id(goalId);
        if (!goal) {
            return res.status(404).json({ success: false, message: 'Goal not found' });
        }

        // Only admin or creator can update
        const isAdmin = familyGroup.admin.toString() === userId;
        const isCreator = goal.createdBy && goal.createdBy.toString() === userId;

        if (!isAdmin && !isCreator) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this goal' });
        }

        if (goalName) goal.goalName = goalName;
        if (targetAmount) goal.targetAmount = targetAmount;
        if (deadline) goal.deadline = deadline;
        if (status) goal.status = status;

        if (goal.currentAmount >= goal.targetAmount) {
            goal.status = 'completed';
        }

        await familyGroup.save();

        res.status(200).json({ success: true, message: 'Goal updated', data: familyGroup.goals });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete a goal
export const deleteFamilyGoal = async (req, res) => {
    try {
        const { goalId } = req.params;
        const familyGroup = req.family;
        const userId = req.user.userId;

        const goal = familyGroup.goals.id(goalId);
        if (!goal) {
            return res.status(404).json({ success: false, message: 'Goal not found' });
        }

        const isAdmin = familyGroup.admin.toString() === userId;
        const isCreator = goal.createdBy && goal.createdBy.toString() === userId;

        if (!isAdmin && !isCreator) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this goal' });
        }

        goal.deleteOne();
        await familyGroup.save();

        res.status(200).json({ success: true, message: 'Goal deleted', data: familyGroup.goals });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
