import FamilyGroup from '../models/FamilyGroup.js';

export const getFamilyAndMember = async (req, res) => {
    const familyId = req.params.familyId || req.body.familyId || req.query.familyId || req.params.groupId;
    if (!familyId) {
        return { error: 'Family ID is required', status: 400 };
    }

    const family = await FamilyGroup.findById(familyId);
    if (!family) {
        return { error: 'Family group not found', status: 404 };
    }

    let member = family.members.find(m => m.user.toString() === req.user.userId);
    if (!member && family.admin.toString() === req.user.userId) {
         member = { role: 'Admin', status: 'Approved' };
    }

    return { family, member };
};

export const requireRoles = (roles) => {
    return async (req, res, next) => {
        try {
            const { family, member, error, status } = await getFamilyAndMember(req, res);
            if (error) return res.status(status).json({ success: false, message: error });

            if (!member || (member.status !== 'Approved' && family.admin.toString() !== req.user.userId)) {
                return res.status(403).json({ success: false, message: 'Only approved family members can access this resource' });
            }

            const userRole = (family.admin.toString() === req.user.userId) ? 'Admin' : member.role;

            if (!roles.includes(userRole) && userRole !== 'Admin') {
                 return res.status(403).json({ success: false, message: `Access denied. Required role: ${roles.join(' or ')}` });
            }

            req.family = family;
            req.familyMember = member;
            req.userRole = userRole;
            next();
        } catch (error) {
             res.status(500).json({ success: false, message: 'Server error during authorization: ' + error.message });
        }
    };
};

export const isFamilyAdmin = requireRoles(['Admin']);
export const isCoAdminOrAdmin = requireRoles(['Admin', 'Co-Admin']);
export const isContributorOrHigher = requireRoles(['Admin', 'Co-Admin', 'Contributor']);
export const isExpenseMemberOrHigher = requireRoles(['Admin', 'Co-Admin', 'Contributor', 'Expense Member']);
export const isApprovedMember = requireRoles(['Admin', 'Co-Admin', 'Contributor', 'Expense Member', 'Viewer']);
