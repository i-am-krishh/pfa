import express from 'express';
import { 
    addInvestment, 
    getAllInvestments, 
    getInvestmentById, 
    updateInvestment, 
    deleteInvestment,
    getInvestmentByType
} from '../controllers/investmentController.js';
import { getInvestmentAdvice } from '../controllers/advisorController.js';
import { getInvestmentAnalytics } from '../controllers/analyticsController.js';
import { authenticate } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// All investment routes require authentication
router.use(authenticate);

// Limit AI advisor calls: max 5 queries per 10 minutes per client
const advisorLimiter = rateLimiter({
    windowMs: 10 * 60 * 1000, 
    max: 5,
    message: 'Too many requests for investment advice. Please try again in 10 minutes.'
});

// Limit portfolio analytics calls: max 15 queries per minute per client
const analyticsLimiter = rateLimiter({
    windowMs: 1 * 60 * 1000, 
    max: 15,
    message: 'Too many analytics queries. Please try again in a minute.'
});

router.post('/', addInvestment);
router.get('/', getAllInvestments);
router.get('/by-type', getInvestmentByType);
router.post('/advisor', advisorLimiter, getInvestmentAdvice);
router.get('/analytics', analyticsLimiter, getInvestmentAnalytics);
router.get('/:id', getInvestmentById);
router.put('/:id', updateInvestment);
router.delete('/:id', deleteInvestment);

export default router;
