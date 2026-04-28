import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { isApprovedMember, isFamilyAdmin } from '../middleware/familyAuth.js';
import {
    addFamilyGoal,
    getFamilyGoals,
    contributeToGoal,
    updateFamilyGoal,
    deleteFamilyGoal
} from '../controllers/familyGoalController.js';

const router = express.Router();

router.use(authenticate);

router.post('/', isApprovedMember, addFamilyGoal);
router.get('/:familyId', isApprovedMember, getFamilyGoals);
router.patch('/:familyId/:goalId/contribute', isApprovedMember, contributeToGoal);
router.patch('/:familyId/:goalId', isApprovedMember, updateFamilyGoal);
router.delete('/:familyId/:goalId', isApprovedMember, deleteFamilyGoal);

export default router;
