import express from 'express';
import {
    saveTaxDetails,
    getTaxDetails,
    getAllTaxRecords,
    deleteTaxRecord,
    generateITRSummary
} from '../controllers/taxSavingController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Save or update tax details
router.post('/', saveTaxDetails);

// Get tax details for current financial year
router.get('/', getTaxDetails);

// Get all tax records
router.get('/all', getAllTaxRecords);

// Generate ITR Summary
router.get('/itr-summary', generateITRSummary);

// Delete tax record
router.delete('/:id', deleteTaxRecord);

export default router;
