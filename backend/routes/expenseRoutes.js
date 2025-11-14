import express from 'express';
import { 
    addExpense, 
    getAllExpenses, 
    getExpenseById, 
    updateExpense, 
    deleteExpense, 
    getExpenseByCategory,
    getMonthlyExpensesSummary
} from '../controllers/expenseController.js';
import { validateExpense, handleValidationErrors } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All expense routes require authentication
router.use(authenticate);

router.post('/', validateExpense, handleValidationErrors, addExpense);
router.get('/', getAllExpenses);
router.get('/by-category', getExpenseByCategory);
router.get('/monthly-summary', getMonthlyExpensesSummary);
router.get('/:id', getExpenseById);
router.put('/:id', validateExpense, handleValidationErrors, updateExpense);
router.delete('/:id', deleteExpense);

export default router;
