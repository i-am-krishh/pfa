import express from 'express';
import { 
    addLoan, 
    getAllLoans, 
    getLoanById, 
    updateLoan, 
    deleteLoan 
} from '../controllers/loanController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All loan routes require authentication
router.use(authenticate);

router.post('/', addLoan);
router.get('/', getAllLoans);
router.get('/:id', getLoanById);
router.put('/:id', updateLoan);
router.delete('/:id', deleteLoan);

export default router;
