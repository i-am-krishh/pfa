import FamilyGroup from '../models/FamilyGroup.js';
import User from '../models/User.js';
import crypto from 'crypto';
import Income from '../models/Income.js';
import Expense from '../models/Expense.js';

// Create a new family group
export const createFamilyGroup = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Family name is required' });
        
        const userId = req.user.userId;

        // Prevent user from creating multiple family groups
        const existingFamily = await FamilyGroup.findOne({ admin: userId });
        if (existingFamily) {
            return res.status(400).json({ success: false, message: 'You are already an admin of a family group.' });
        }

        // Generate a FAM-XXXXXX code
        const familyCode = 'FAM-' + crypto.randomBytes(3).toString('hex').toUpperCase();

        const familyGroup = new FamilyGroup({
            name,
            admin: userId,
            familyCode,
            members: [{
                user: userId,
                role: 'Admin',
                status: 'Approved'
            }]
        });

        await familyGroup.save();

        res.status(201).json({
            success: true,
            message: 'Family group created successfully',
            data: familyGroup
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Join a family group using invite code
export const joinFamilyGroup = async (req, res) => {
    try {
        const { familyCode } = req.body;
        if (!familyCode) return res.status(400).json({ success: false, message: 'Family code is required' });
        
        const userId = req.user.userId;

        const familyGroup = await FamilyGroup.findOne({ familyCode });

        if (!familyGroup) {
            return res.status(404).json({ success: false, message: 'Invalid family code' });
        }

        // Check if user is already a member or has a pending request
        const existingMember = familyGroup.members.find(m => m.user.toString() === userId);
        
        if (existingMember) {
            return res.status(400).json({ success: false, message: `You are already a member with status: ${existingMember.status}` });
        }

        familyGroup.members.push({
            user: userId,
            role: 'Contributor',
            status: 'Pending'
        });

        await familyGroup.save();

        res.status(200).json({
            success: true,
            message: 'Join request sent to admin',
            data: familyGroup
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all members for a specific family
export const getFamilyMembers = async (req, res) => {
    try {
        // req.family is populated by isFamilyAdmin / isApprovedMember middleware
        const familyGroup = req.family; 
        
        await familyGroup.populate('members.user', 'fullName email profileImage');
        res.status(200).json({ 
            success: true, 
            data: familyGroup.members,
            familyCode: familyGroup.familyCode 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Approve member request
export const approveMember = async (req, res) => {
    try {
        const { memberId } = req.params; // userId of the member
        const familyGroup = req.family; // populated by isFamilyAdmin

        const memberIndex = familyGroup.members.findIndex(m => m.user.toString() === memberId);
        if (memberIndex === -1) {
            return res.status(404).json({ success: false, message: 'Member request not found' });
        }

        familyGroup.members[memberIndex].status = 'Approved';
        await familyGroup.save();

        res.status(200).json({ success: true, message: 'Member approved successfully', data: familyGroup.members });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Reject member request
export const rejectMember = async (req, res) => {
    try {
        const { memberId } = req.params;
        const familyGroup = req.family;

        const memberIndex = familyGroup.members.findIndex(m => m.user.toString() === memberId);
        if (memberIndex === -1) {
            return res.status(404).json({ success: false, message: 'Member request not found' });
        }

        familyGroup.members[memberIndex].status = 'Rejected';
        // We can also remove them from the array:
        familyGroup.members.splice(memberIndex, 1);
        
        await familyGroup.save();

        res.status(200).json({ success: true, message: 'Member rejected and removed', data: familyGroup.members });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Remove member
export const removeMember = async (req, res) => {
    try {
        const { memberId } = req.params;
        const familyGroup = req.family;

        if (familyGroup.admin.toString() === memberId) {
            return res.status(400).json({ success: false, message: 'Cannot remove the admin from the family' });
        }

        const memberIndex = familyGroup.members.findIndex(m => m.user.toString() === memberId);
        if (memberIndex === -1) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        familyGroup.members.splice(memberIndex, 1);
        await familyGroup.save();

        res.status(200).json({ success: true, message: 'Member removed successfully', data: familyGroup.members });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all family groups for the current user
export const getMyFamilyGroups = async (req, res) => {
    try {
        const userId = req.user.userId;

        const familyGroups = await FamilyGroup.find({
            'members.user': userId
        }).populate('members.user', 'fullName email profileImage');

        const formattedGroups = familyGroups.map(group => {
            const myMemberInfo = group.members.find(m => m.user._id.toString() === userId);
            return {
                ...group.toObject(),
                myStatus: myMemberInfo ? myMemberInfo.status : null,
                myRole: myMemberInfo ? myMemberInfo.role : null
            };
        });

        res.status(200).json({
            success: true,
            data: formattedGroups
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get family dashboard details
export const getFamilyDashboard = async (req, res) => {
    try {
        const familyGroup = req.family; // Populated by requireRoles
        const familyId = familyGroup._id;
        const member = req.familyMember;
        const userRole = req.userRole;

        // Populate members to get user details for the charts
        await familyGroup.populate('members.user', 'fullName email profileImage');

        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        const isAdminOrCo = userRole === 'Admin' || userRole === 'Co-Admin';

        // Get approved members who are sharing data
        const approvedMembers = familyGroup.members.filter(m => m.status === 'Approved' || (familyGroup.admin.toString() === m.user._id.toString()));
        const shareIncomeUserIds = approvedMembers.filter(m => m.shareIncome || (familyGroup.admin.toString() === m.user._id.toString() && m.shareIncome)).map(m => m.user._id);
        const shareExpenseUserIds = approvedMembers.filter(m => m.shareExpenses || (familyGroup.admin.toString() === m.user._id.toString() && m.shareExpenses)).map(m => m.user._id);

        // Include admin explicitly if they are the one requesting and it's their data
        const adminId = familyGroup.admin;

        let incomeMatch = {
            $or: [
                { familyGroupId: familyId, status: 'approved' }, // Direct family
                {
                    'familySync.enabled': true,
                    'familySync.familyId': familyId,
                    'familySync.visibility': 'family',
                    userId: { $in: shareIncomeUserIds }
                }
            ]
        };

        let expenseMatch = {
            $or: [
                { familyGroupId: familyId, status: 'approved' }, // Direct family
                {
                    'familySync.enabled': true,
                    'familySync.familyId': familyId,
                    'familySync.visibility': 'family',
                    userId: { $in: shareExpenseUserIds }
                }
            ]
        };

        // Privacy filters for members
        if (!isAdminOrCo) {
            if (!member.canViewIncome) {
                incomeMatch = { ...incomeMatch, userId: req.user.userId };
            }
            if (!member.canViewOtherMembersExpenses) {
                expenseMatch = { ...expenseMatch, userId: req.user.userId };
            }
        }

        // --- Incomes Aggregation ---
        const incomesAgg = await Income.aggregate([
            { $match: incomeMatch },
            { 
                $facet: {
                    totalIncome: [ { $group: { _id: null, total: { $sum: '$amount' } } } ],
                    directIncome: [
                        { $match: { familyGroupId: familyId } },
                        { $group: { _id: null, total: { $sum: '$amount' } } }
                    ],
                    sharedIncome: [
                        { $match: { familyGroupId: null } },
                        { $group: { _id: null, total: { $sum: '$amount' } } }
                    ],
                    monthlyIncome: [
                        { $match: { date: { $gte: startOfMonth } } },
                        { $group: { _id: null, total: { $sum: '$amount' } } }
                    ],
                    memberContribution: [
                        { $group: { _id: '$userId', total: { $sum: '$amount' } } },
                        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
                        { $unwind: '$user' },
                        { $project: { _id: 1, total: 1, name: '$user.fullName' } }
                    ],
                    recentIncomes: [
                        { $sort: { date: -1 } },
                        { $limit: 10 },
                        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
                        { $unwind: '$user' },
                        { $addFields: { 
                            type: 'income', 
                            userName: '$user.fullName',
                            dataSource: { $cond: [{ $ifNull: ['$familyGroupId', false] }, 'family_direct', 'personal_shared'] }
                        } }
                    ]
                }
            }
        ]);

        // --- Expenses Aggregation ---
        const expensesAgg = await Expense.aggregate([
            { $match: expenseMatch },
            { 
                $facet: {
                    totalExpense: [ { $group: { _id: null, total: { $sum: '$amount' } } } ],
                    directExpense: [
                        { $match: { familyGroupId: familyId } },
                        { $group: { _id: null, total: { $sum: '$amount' } } }
                    ],
                    sharedExpense: [
                        { $match: { familyGroupId: null } },
                        { $group: { _id: null, total: { $sum: '$amount' } } }
                    ],
                    monthlyExpense: [
                        { $match: { date: { $gte: startOfMonth } } },
                        { $group: { _id: null, total: { $sum: '$amount' } } }
                    ],
                    categoryWise: [
                        { $group: { _id: '$category', total: { $sum: '$amount' } } }
                    ],
                    memberSpending: [
                        { $group: { _id: '$userId', total: { $sum: '$amount' } } },
                        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
                        { $unwind: '$user' },
                        { $project: { _id: 1, total: 1, name: '$user.fullName' } }
                    ],
                    recentExpenses: [
                        { $sort: { date: -1 } },
                        { $limit: 10 },
                        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
                        { $unwind: '$user' },
                        { $addFields: { 
                            type: 'expense', 
                            userName: '$user.fullName',
                            dataSource: { $cond: [{ $ifNull: ['$familyGroupId', false] }, 'family_direct', 'personal_shared'] }
                        } }
                    ]
                }
            }
        ]);

        // --- Processing Results ---
        const incData = incomesAgg[0];
        const expData = expensesAgg[0];

        const totalIncome = incData.totalIncome[0]?.total || 0;
        const directIncome = incData.directIncome[0]?.total || 0;
        const sharedIncome = incData.sharedIncome[0]?.total || 0;

        const totalExpense = expData.totalExpense[0]?.total || 0;
        const directExpense = expData.directExpense[0]?.total || 0;
        const sharedExpense = expData.sharedExpense[0]?.total || 0;

        const totalSavings = totalIncome - totalExpense;

        const monthlyIncome = incData.monthlyIncome[0]?.total || 0;
        const monthlyExpense = expData.monthlyExpense[0]?.total || 0;

        // Pending approvals count
        let pendingCount = 0;
        if (isAdminOrCo) {
            const pendingIncomes = await Income.countDocuments({ familyGroupId: familyId, status: 'pending' });
            const pendingExpenses = await Expense.countDocuments({ familyGroupId: familyId, status: 'pending' });
            pendingCount = pendingIncomes + pendingExpenses;
        }

        // Combine and sort recent transactions
        let recentTransactions = [...incData.recentIncomes, ...expData.recentExpenses];
        recentTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        recentTransactions = recentTransactions.slice(0, 10);

        // Budgets logic
        const activeBudgets = familyGroup.budgets.map(b => {
            const usagePercent = b.limit > 0 ? (b.usedAmount / b.limit) * 100 : 0;
            return {
                ...b.toObject(),
                usagePercent: usagePercent.toFixed(2)
            };
        });

        // Goals logic
        const activeGoals = familyGroup.goals.filter(g => g.status === 'active');

        res.status(200).json({
            success: true,
            data: {
                totalIncome,
                directIncome,
                sharedIncome,
                totalExpenses: totalExpense,
                directExpenses: directExpense,
                sharedExpenses: sharedExpense,
                totalSavings,
                monthlyIncome,
                monthlyExpenses: monthlyExpense,
                categoryWiseExpenses: expData.categoryWise,
                memberContribution: incData.memberContribution,
                memberSpending: expData.memberSpending,
                recentTransactions,
                activeGoals,
                activeBudgets,
                members: familyGroup.members, 
                myMemberData: req.familyMember,
                myRole: req.userRole,
                pendingCount
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateMemberSharingSettings = async (req, res) => {
    try {
        const { familyId } = req.params;
        const { shareIncome, shareExpenses, shareInvestments, shareLoans } = req.body;
        const userId = req.user.userId;

        const familyGroup = await FamilyGroup.findById(familyId);
        if (!familyGroup) return res.status(404).json({ success: false, message: 'Family group not found' });

        const memberIndex = familyGroup.members.findIndex(m => m.user.toString() === userId);
        if (memberIndex === -1 && familyGroup.admin.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Not a member of this family' });
        }

        // If it's the admin and not in the members array, we might need a different logic or ensure admin is in members
        // But usually admin is in members or has a special entry.
        
        let targetMember;
        if (memberIndex !== -1) {
            targetMember = familyGroup.members[memberIndex];
        } else {
            // Admin might not be in the members array if logic is slightly different, 
            // but requirement says "Add sharing settings to FamilyMember model"
            // Let's assume admin needs to be treated as a member for sharing too.
            return res.status(403).json({ success: false, message: 'Admin must be part of members array to have sharing settings' });
        }

        if (shareIncome !== undefined) targetMember.shareIncome = shareIncome;
        if (shareExpenses !== undefined) targetMember.shareExpenses = shareExpenses;
        if (shareInvestments !== undefined) targetMember.shareInvestments = shareInvestments;
        if (shareLoans !== undefined) targetMember.shareLoans = shareLoans;

        await familyGroup.save();
        res.status(200).json({ success: true, message: 'Sharing settings updated', data: targetMember });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update member role and limits
export const updateMemberRole = async (req, res) => {
    try {
        const { memberId } = req.params;
        const { role, monthlyAllowance, expenseApprovalLimit, canViewIncome, canViewInvestments, canViewLoans, canViewOtherMembersExpenses } = req.body;
        const familyGroup = req.family;

        if (familyGroup.admin.toString() === memberId) {
            return res.status(400).json({ success: false, message: 'Cannot change role of the family admin' });
        }

        const memberIndex = familyGroup.members.findIndex(m => m.user.toString() === memberId);
        if (memberIndex === -1) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        const member = familyGroup.members[memberIndex];

        if (role !== undefined) member.role = role;
        if (monthlyAllowance !== undefined) member.monthlyAllowance = monthlyAllowance;
        if (expenseApprovalLimit !== undefined) member.expenseApprovalLimit = expenseApprovalLimit;
        if (canViewIncome !== undefined) member.canViewIncome = canViewIncome;
        if (canViewInvestments !== undefined) member.canViewInvestments = canViewInvestments;
        if (canViewLoans !== undefined) member.canViewLoans = canViewLoans;
        if (canViewOtherMembersExpenses !== undefined) member.canViewOtherMembersExpenses = canViewOtherMembersExpenses;

        await familyGroup.save();

        res.status(200).json({ success: true, message: 'Member updated successfully', data: familyGroup.members });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Regenerate family invite code
export const regenerateFamilyCode = async (req, res) => {
    try {
        const familyGroup = req.family; // populated by isFamilyAdmin
        
        // Generate a new FAM-XXXXXX code
        const newCode = 'FAM-' + crypto.randomBytes(3).toString('hex').toUpperCase();
        
        familyGroup.familyCode = newCode;
        await familyGroup.save();

        res.status(200).json({ 
            success: true, 
            message: 'Invite code regenerated successfully', 
            familyCode: newCode 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
