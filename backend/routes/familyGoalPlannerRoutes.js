import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { isApprovedMember, isContributorOrHigher } from '../middleware/familyAuth.js';
import {
    analyzeGoal,
    getFamilyGoalPlans,
    getGoalPlanDetail
} from '../controllers/familyGoalPlannerController.js';

const router = express.Router();

router.use(authenticate);

// Admin, Co-Admin, and Contributor can create goal plans
router.post('/analyze', isContributorOrHigher, analyzeGoal);

// All approved members can view plans
router.get('/:familyId', isApprovedMember, getFamilyGoalPlans);
router.get('/detail/:planId', isApprovedMember, getGoalPlanDetail);

export default router;
