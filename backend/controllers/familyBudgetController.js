import FamilyGroup from '../models/FamilyGroup.js';
import Expense from '../models/Expense.js';

// Add a budget
export const addFamilyBudget = async (req, res) => {
    try {
        const { familyId, category, limit, month, year } = req.body;
        
        if (!category || !limit) {
            return res.status(400).json({ success: false, message: 'Category and limit are required' });
        }
        
        const familyGroup = req.family; // from isFamilyAdmin middleware

        // Calculate existing expenses for this category and month/year
        const query = { 
            familyGroupId: familyGroup._id,
            category: category
        };
        
        if (month) {
            const startDate = new Date(`${month}-01`);
            const endDate = new Date(new Date(startDate).setMonth(startDate.getMonth() + 1));
            query.date = { $gte: startDate, $lt: endDate };
        } else if (year) {
            const startDate = new Date(`${year}-01-01`);
            const endDate = new Date(`${year + 1}-01-01`);
            query.date = { $gte: startDate, $lt: endDate };
        }

        const existingExpenses = await Expense.find(query);
        const usedAmount = existingExpenses.reduce((sum, exp) => sum + exp.amount, 0);

        const newBudget = {
            category,
            limit,
            month,
            year,
            usedAmount: usedAmount,
            createdBy: req.user.userId
        };

        familyGroup.budgets.push(newBudget);
        await familyGroup.save();

        res.status(201).json({ success: true, message: 'Budget created', data: familyGroup.budgets });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get budgets with alert logic
export const getFamilyBudgets = async (req, res) => {
    try {
        const familyGroup = req.family; // from isApprovedMember middleware

        const budgetsWithAlerts = familyGroup.budgets.map(budget => {
            const usagePercent = (budget.usedAmount / budget.limit) * 100;
            let alert = 'normal';

            if (usagePercent > 100) {
                alert = 'exceeded';
            } else if (usagePercent >= 90) {
                alert = 'danger';
            } else if (usagePercent >= 70) {
                alert = 'warning';
            }

            return {
                ...budget.toObject(),
                usagePercent: usagePercent.toFixed(2),
                alert
            };
        });

        res.status(200).json({ success: true, data: budgetsWithAlerts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update a budget
export const updateFamilyBudget = async (req, res) => {
    try {
        const { budgetId } = req.params;
        const { category, limit, month, year } = req.body;
        const familyGroup = req.family;

        const budget = familyGroup.budgets.id(budgetId);
        if (!budget) {
            return res.status(404).json({ success: false, message: 'Budget not found' });
        }

        if (category) budget.category = category;
        if (limit) budget.limit = limit;
        if (month) budget.month = month;
        if (year) budget.year = year;

        await familyGroup.save();

        res.status(200).json({ success: true, message: 'Budget updated', data: familyGroup.budgets });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete a budget
export const deleteFamilyBudget = async (req, res) => {
    try {
        const { budgetId } = req.params;
        const familyGroup = req.family;

        const budgetIndex = familyGroup.budgets.findIndex(b => b._id.toString() === budgetId);
        
        if (budgetIndex === -1) {
            return res.status(404).json({ success: false, message: 'Budget not found' });
        }

        familyGroup.budgets.splice(budgetIndex, 1);
        await familyGroup.save();

        res.status(200).json({ success: true, message: 'Budget deleted', data: familyGroup.budgets });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
