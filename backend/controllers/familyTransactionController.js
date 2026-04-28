import Income from '../models/Income.js';
import Expense from '../models/Expense.js';
import FamilyGroup from '../models/FamilyGroup.js';

// Add a transaction
export const addFamilyTransaction = async (req, res) => {
    try {
        const { type, amount, category, description, date, source, isRecurring, frequency } = req.body;
        
        if (!type || !amount || !category || !date) {
            return res.status(400).json({ success: false, message: 'Type, amount, category and date are required' });
        }
        
        const familyGroup = req.family; // populated by isApprovedMember
        const userId = req.user.userId;
        const userRole = req.userRole;

        if (userRole === 'Viewer') {
            return res.status(403).json({ success: false, message: 'Viewers cannot add transactions' });
        }
        if (type === 'income' && userRole === 'Expense Member') {
            return res.status(403).json({ success: false, message: 'Expense Members cannot add income' });
        }

        let status = 'approved';
        if (type === 'expense' && userRole === 'Expense Member') {
            if (amount > (req.familyMember.expenseApprovalLimit || 0)) {
                status = 'pending';
            }
        }

        let transaction;
        
        if (type === 'income') {
            const validSources = ['salary', 'freelance', 'investment', 'bonus', 'gift', 'other'];
            let incomeSource = source || category;
            if (typeof incomeSource === 'string' && !validSources.includes(incomeSource.toLowerCase())) {
                incomeSource = 'other';
            } else if (typeof incomeSource === 'string') {
                incomeSource = incomeSource.toLowerCase();
            }

            transaction = new Income({
                userId,
                familyGroupId: familyGroup._id,
                source: incomeSource,
                amount,
                description,
                date,
                category,
                isRecurring,
                frequency,
                status
            });
            await transaction.save();
        } else if (type === 'expense') {
            transaction = new Expense({
                userId,
                familyGroupId: familyGroup._id,
                amount,
                description,
                date,
                category,
                isRecurring,
                frequency,
                status
            });
            await transaction.save();

            // Auto-update budget only if approved
            if (status === 'approved') {
                const currentMonth = new Date(date).toISOString().slice(0, 7); // YYYY-MM
                const currentYear = new Date(date).getFullYear();
                
                const budget = familyGroup.budgets.find(b => 
                    b.category === category && (b.month === currentMonth || b.year === currentYear)
                );
                
                if (budget) {
                    budget.usedAmount += Number(amount);
                    await familyGroup.save();
                }
            }
        } else {
            return res.status(400).json({ success: false, message: 'Invalid transaction type' });
        }

        res.status(201).json({ success: true, message: 'Transaction added successfully', data: transaction });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get transactions
export const getFamilyTransactions = async (req, res) => {
    try {
        const { type, category, startDate, endDate } = req.query;
        const memberQueryParam = req.query.member;
        const familyId = req.params.familyId;
        const member = req.familyMember;
        const userRole = req.userRole;
        const isAdminOrCo = userRole === 'Admin' || userRole === 'Co-Admin';

        let incomes = [];
        let expenses = [];

        // Build base queries
        const baseQuery = { familyGroupId: familyId };
        if (category) baseQuery.category = category;
        if (startDate || endDate) {
            baseQuery.date = {};
            if (startDate) baseQuery.date.$gte = new Date(startDate);
            if (endDate) baseQuery.date.$lte = new Date(endDate);
        }

        let incomeQuery = { ...baseQuery };
        let expenseQuery = { ...baseQuery };

        if (!isAdminOrCo) {
             if (!member.canViewIncome) {
                 incomeQuery.userId = req.user.userId;
             } else {
                 incomeQuery.$or = [{ status: 'approved' }, { userId: req.user.userId }];
             }

             if (!member.canViewOtherMembersExpenses) {
                 expenseQuery.userId = req.user.userId;
             } else {
                 expenseQuery.$or = [{ status: 'approved' }, { userId: req.user.userId }];
             }
        }

        if (memberQueryParam) {
            incomeQuery.userId = memberQueryParam;
            expenseQuery.userId = memberQueryParam;
        }

        if (!type || type === 'income') {
            incomes = await Income.find(incomeQuery).populate('userId', 'fullName profileImage').lean();
            incomes = incomes.map(i => ({ ...i, type: 'income' }));
        }
        
        if (!type || type === 'expense') {
            expenses = await Expense.find(expenseQuery).populate('userId', 'fullName profileImage').lean();
            expenses = expenses.map(e => ({ ...e, type: 'expense' }));
        }

        let transactions = [...incomes, ...expenses];
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.status(200).json({ success: true, data: transactions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update transaction
export const updateFamilyTransaction = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { type, amount, category, description, date } = req.body;
        const familyGroup = req.family; // populated by isApprovedMember
        const userId = req.user.userId;

        // Ensure user is admin or creator
        const isAdmin = familyGroup.admin.toString() === userId;

        if (type === 'income') {
            const income = await Income.findById(transactionId);
            if (!income) return res.status(404).json({ success: false, message: 'Transaction not found' });
            if (!isAdmin && income.userId.toString() !== userId) return res.status(403).json({ success: false, message: 'Not authorized' });

            if (amount) income.amount = amount;
            if (category) income.category = category;
            if (description) income.description = description;
            if (date) income.date = date;

            await income.save();
            return res.status(200).json({ success: true, data: income });

        } else if (type === 'expense') {
            const expense = await Expense.findById(transactionId);
            if (!expense) return res.status(404).json({ success: false, message: 'Transaction not found' });
            if (!isAdmin && expense.userId.toString() !== userId) return res.status(403).json({ success: false, message: 'Not authorized' });

            const amountDiff = amount ? Number(amount) - expense.amount : 0;
            const oldCategory = expense.category;
            const newCategory = category || expense.category;

            if (amount) expense.amount = amount;
            if (category) expense.category = category;
            if (description) expense.description = description;
            if (date) expense.date = date;

            await expense.save();

            // Handle budget updates
            if (amountDiff !== 0 || oldCategory !== newCategory) {
                const currentMonth = new Date(expense.date).toISOString().slice(0, 7);
                const currentYear = new Date(expense.date).getFullYear();

                if (oldCategory !== newCategory) {
                    // Remove from old budget
                    const oldBudget = familyGroup.budgets.find(b => b.category === oldCategory && (b.month === currentMonth || b.year === currentYear));
                    if (oldBudget) oldBudget.usedAmount -= Number(expense.amount);

                    // Add to new budget
                    const newBudget = familyGroup.budgets.find(b => b.category === newCategory && (b.month === currentMonth || b.year === currentYear));
                    if (newBudget) newBudget.usedAmount += Number(amount || expense.amount);
                } else {
                    // Just update amount diff
                    const budget = familyGroup.budgets.find(b => b.category === oldCategory && (b.month === currentMonth || b.year === currentYear));
                    if (budget) budget.usedAmount += amountDiff;
                }
                await familyGroup.save();
            }

            return res.status(200).json({ success: true, data: expense });
        } else {
            return res.status(400).json({ success: false, message: 'Type must be provided for update (income or expense)' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete transaction
export const deleteFamilyTransaction = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { type } = req.query; // Need type to know which collection
        const familyGroup = req.family;
        const userId = req.user.userId;
        const isAdmin = familyGroup.admin.toString() === userId;

        if (type === 'income') {
            const income = await Income.findById(transactionId);
            if (!income) return res.status(404).json({ success: false, message: 'Transaction not found' });
            if (!isAdmin && income.userId.toString() !== userId) return res.status(403).json({ success: false, message: 'Not authorized' });
            
            await Income.findByIdAndDelete(transactionId);
            return res.status(200).json({ success: true, message: 'Transaction deleted' });

        } else if (type === 'expense') {
            const expense = await Expense.findById(transactionId);
            if (!expense) return res.status(404).json({ success: false, message: 'Transaction not found' });
            if (!isAdmin && expense.userId.toString() !== userId) return res.status(403).json({ success: false, message: 'Not authorized' });

            await Expense.findByIdAndDelete(transactionId);

            // Update budget
            const currentMonth = new Date(expense.date).toISOString().slice(0, 7);
            const currentYear = new Date(expense.date).getFullYear();
            const budget = familyGroup.budgets.find(b => b.category === expense.category && (b.month === currentMonth || b.year === currentYear));
            
            if (budget) {
                budget.usedAmount -= expense.amount;
                await familyGroup.save();
            }

            return res.status(200).json({ success: true, message: 'Transaction deleted' });
        } else {
            return res.status(400).json({ success: false, message: 'Type must be provided for delete (income or expense) as query param' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Approve transaction
export const approveTransaction = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { type } = req.body; // 'income' or 'expense'
        const familyGroup = req.family;

        if (!type) {
            return res.status(400).json({ success: false, message: 'Type is required' });
        }

        const Model = type === 'income' ? Income : Expense;
        const transaction = await Model.findById(transactionId);

        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        if (transaction.status === 'approved') {
            return res.status(400).json({ success: false, message: 'Transaction is already approved' });
        }

        transaction.status = 'approved';
        transaction.approvedBy = req.user.userId;
        transaction.approvedAt = Date.now();
        await transaction.save();

        // Update budget if expense
        if (type === 'expense') {
            const currentMonth = new Date(transaction.date).toISOString().slice(0, 7);
            const currentYear = new Date(transaction.date).getFullYear();
            
            const budget = familyGroup.budgets.find(b => 
                b.category === transaction.category && (b.month === currentMonth || b.year === currentYear)
            );
            
            if (budget) {
                budget.usedAmount += Number(transaction.amount);
                await familyGroup.save();
            }
        }

        res.status(200).json({ success: true, message: 'Transaction approved', data: transaction });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Reject transaction
export const rejectTransaction = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { type, rejectionReason } = req.body;
        
        if (!type) {
            return res.status(400).json({ success: false, message: 'Type is required' });
        }

        const Model = type === 'income' ? Income : Expense;
        const transaction = await Model.findById(transactionId);

        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        if (transaction.status === 'approved') {
            // Un-approve could be tricky with budgets, but let's assume we can reject pending easily
             return res.status(400).json({ success: false, message: 'Cannot reject an already approved transaction directly' });
        }

        transaction.status = 'rejected';
        transaction.rejectionReason = rejectionReason || 'No reason provided';
        await transaction.save();

        res.status(200).json({ success: true, message: 'Transaction rejected', data: transaction });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
