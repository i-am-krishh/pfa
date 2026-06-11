import express from 'express';
import { buyHolding, sellHolding, getHoldings, createHolding, updateHolding, deleteHoldingById } from '../controllers/portfolioController.js';
import { authenticate } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Secure all portfolio endpoints
router.use(authenticate);

// Limit portfolio transactions/reads: max 60 per minute
const portfolioLimiter = rateLimiter({
    windowMs: 60 * 1000,
    max: 60,
    message: 'Too many portfolio requests. Please try again in a minute.'
});

router.use(portfolioLimiter);

router.post('/buy', buyHolding);
router.post('/sell', sellHolding);
router.get('/', getHoldings);

// Standard REST CRUD endpoints
router.post('/', createHolding);
router.patch('/:id', updateHolding);
router.delete('/:id', deleteHoldingById);

export default router;

