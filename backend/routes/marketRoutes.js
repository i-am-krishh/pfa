import express from 'express';
import { getMarketOverview } from '../controllers/marketOverviewController.js';
import { getMarketNews } from '../controllers/stockController.js';
import { getStockAIAnalysis } from '../controllers/marketAIController.js';
import { authenticate } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Secure all market intelligence endpoints
router.use(authenticate);

// Limit AI requests: max 10 per 10 minutes
const aiLimiter = rateLimiter({
    windowMs: 10 * 60 * 1000,
    max: 10,
    message: 'Too many stock analysis requests. Please try again in 10 minutes.'
});

// Limit general news/overview: max 30 per minute
const queryLimiter = rateLimiter({
    windowMs: 60 * 1000,
    max: 30,
    message: 'Too many queries. Please try again in a minute.'
});

router.get('/overview', queryLimiter, getMarketOverview);
router.get('/news', queryLimiter, getMarketNews);
router.post('/ai-analysis', aiLimiter, getStockAIAnalysis);

export default router;
