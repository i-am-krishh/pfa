import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { isFamilyAdmin, isApprovedMember } from '../middleware/familyAuth.js';
import {
    addFamilyBudget,
    getFamilyBudgets,
    updateFamilyBudget,
    deleteFamilyBudget
} from '../controllers/familyBudgetController.js';

const router = express.Router();

router.use(authenticate);

router.post('/', isFamilyAdmin, addFamilyBudget);
router.get('/:familyId', isApprovedMember, getFamilyBudgets);
router.patch('/:familyId/:budgetId', isFamilyAdmin, updateFamilyBudget);
router.delete('/:familyId/:budgetId', isFamilyAdmin, deleteFamilyBudget);

export default router;
