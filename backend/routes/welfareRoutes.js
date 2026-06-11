import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { isApprovedMember, isContributorOrHigher } from '../middleware/familyAuth.js';
import {
    getWelfareProfile,
    updateWelfareProfile,
    toggleSchemeStatus
} from '../controllers/welfareController.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticate);

// Fetch profile & eligible schemes
router.get('/profile/:familyId', isApprovedMember, getWelfareProfile);

// Update demographics & trigger rules engine recommendations
router.post('/profile/:familyId', isContributorOrHigher, updateWelfareProfile);

// Toggle/Mark scheme application status
router.post('/apply/:familyId/:schemeId', isContributorOrHigher, toggleSchemeStatus);

export default router;
