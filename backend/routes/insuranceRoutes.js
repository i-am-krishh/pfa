import express from 'express';
import { 
    addInsurance, 
    getAllInsurances, 
    getInsuranceById, 
    updateInsurance, 
    deleteInsurance 
} from '../controllers/insuranceController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All insurance routes require authentication
router.use(authenticate);

router.post('/', addInsurance);
router.get('/', getAllInsurances);
router.get('/:id', getInsuranceById);
router.put('/:id', updateInsurance);
router.delete('/:id', deleteInsurance);

export default router;
