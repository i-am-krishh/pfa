import express from 'express';
import { getFamilyPortfolio } from '../controllers/familyPortfolioController.js';
import { authenticate } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Secure all family portfolio endpoints
router.use(authenticate);

// Limit family portfolio reads: max 30 per minute
const familyPortfolioLimiter = rateLimiter({
    windowMs: 60 * 1000,
    max: 30,
    message: 'Too many family portfolio queries. Please try again in a minute.'
});

router.get('/:familyId', familyPortfolioLimiter, getFamilyPortfolio);

export default router;
