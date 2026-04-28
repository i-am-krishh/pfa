import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { isFamilyAdmin, isApprovedMember } from '../middleware/familyAuth.js';
import {
    createFamilyGroup,
    joinFamilyGroup,
    getFamilyMembers,
    approveMember,
    rejectMember,
    removeMember,
    getMyFamilyGroups,
    getFamilyDashboard,
    regenerateFamilyCode,
    updateMemberRole,
    updateMemberSharingSettings
} from '../controllers/familyController.js';

const router = express.Router();

router.use(authenticate);

// Core
router.post('/create', createFamilyGroup);
router.post('/join', joinFamilyGroup);
router.get('/my-families', getMyFamilyGroups);
router.get('/my-family', getMyFamilyGroups); // Alias as requested

// Member Management
router.get('/members/:familyId', isFamilyAdmin, getFamilyMembers);
router.patch('/member/:memberId/approve', isFamilyAdmin, approveMember);
router.patch('/member/:memberId/reject', isFamilyAdmin, rejectMember);
router.patch('/member/:memberId/role', isFamilyAdmin, updateMemberRole);
router.delete('/member/:memberId', isFamilyAdmin, removeMember);
router.post('/regenerate-code', isFamilyAdmin, regenerateFamilyCode);

// Dashboard & Sync
router.get('/dashboard/:familyId', isApprovedMember, getFamilyDashboard);
router.patch('/sharing-settings/:familyId', isApprovedMember, updateMemberSharingSettings);

export default router;
