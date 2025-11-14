import express from 'express';
import { getDashboardSummary, getMonthlyReport } from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All dashboard routes require authentication
router.use(authenticate);

router.get('/summary', getDashboardSummary);
router.get('/monthly-report', getMonthlyReport);

export default router;
