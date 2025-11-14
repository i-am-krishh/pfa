import express from 'express';
import { 
    addInvestment, 
    getAllInvestments, 
    getInvestmentById, 
    updateInvestment, 
    deleteInvestment,
    getInvestmentByType
} from '../controllers/investmentController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All investment routes require authentication
router.use(authenticate);

router.post('/', addInvestment);
router.get('/', getAllInvestments);
router.get('/by-type', getInvestmentByType);
router.get('/:id', getInvestmentById);
router.put('/:id', updateInvestment);
router.delete('/:id', deleteInvestment);

export default router;
