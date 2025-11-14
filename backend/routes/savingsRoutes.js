import express from 'express';
import { 
    addSavings, 
    getAllSavings, 
    getSavingsById, 
    updateSavings, 
    deleteSavings 
} from '../controllers/savingsController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All savings routes require authentication
router.use(authenticate);

router.post('/', addSavings);
router.get('/', getAllSavings);
router.get('/:id', getSavingsById);
router.put('/:id', updateSavings);
router.delete('/:id', deleteSavings);

export default router;
