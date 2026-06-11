import express from 'express';
import { 
    getStockHistory, 
    getStockQuote, 
    searchStocks, 
    getTrendingStocks, 
    getMarketNews, 
    getStockTechnicalIndicators,
    getStockDetailsFlat,
    getStockHistoryFlat
} from '../controllers/stockController.js';
import { authenticate } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Secure all stock endpoints with JWT authentication middleware
router.use(authenticate);

// Limit stock queries: max 60 queries per minute per client
const stockLimiter = rateLimiter({
    windowMs: 60 * 1000,
    max: 60,
    message: 'Too many stock queries. Please try again in a minute.'
});

router.use(stockLimiter);

router.get('/search', searchStocks);
router.get('/trending', getTrendingStocks);
router.get('/news', getMarketNews);
router.get('/quote/:symbol', getStockQuote);
router.get('/history/:symbol', getStockHistory);
router.get('/technical/:symbol', getStockTechnicalIndicators);

// Flat endpoints for Step 5 & Step 6
router.get('/:symbol', getStockDetailsFlat);
router.get('/:symbol/history', getStockHistoryFlat);

export default router;
