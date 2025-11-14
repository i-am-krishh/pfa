import express from 'express';
import { 
    addIncome, 
    getAllIncomes, 
    getIncomeById, 
    updateIncome, 
    deleteIncome, 
    getIncomeBySource 
} from '../controllers/incomeController.js';
import { validateIncome, handleValidationErrors } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All income routes require authentication
router.use(authenticate);

router.post('/', validateIncome, handleValidationErrors, addIncome);
router.get('/', getAllIncomes);
router.get('/by-source', getIncomeBySource);
router.get('/:id', getIncomeById);
router.put('/:id', validateIncome, handleValidationErrors, updateIncome);
router.delete('/:id', deleteIncome);

export default router;
