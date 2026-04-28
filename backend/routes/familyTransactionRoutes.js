import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { isApprovedMember } from '../middleware/familyAuth.js';
import {
    addFamilyTransaction,
    getFamilyTransactions,
    updateFamilyTransaction,
    deleteFamilyTransaction,
    approveTransaction,
    rejectTransaction
} from '../controllers/familyTransactionController.js';
import { isCoAdminOrAdmin } from '../middleware/familyAuth.js';

const router = express.Router();

router.use(authenticate);

// Note: Using isApprovedMember middleware for all these routes since both creator and admin can manipulate
// The controller has internal logic to check if they are the creator or admin for update/delete.

router.post('/', isApprovedMember, addFamilyTransaction);
router.get('/:familyId', isApprovedMember, getFamilyTransactions);
router.patch('/:familyId/:transactionId', isApprovedMember, updateFamilyTransaction);
router.delete('/:familyId/:transactionId', isApprovedMember, deleteFamilyTransaction);

// Approval routes
router.patch('/:familyId/:transactionId/approve', isCoAdminOrAdmin, approveTransaction);
router.patch('/:familyId/:transactionId/reject', isCoAdminOrAdmin, rejectTransaction);

export default router;
