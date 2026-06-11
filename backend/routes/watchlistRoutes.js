import express from 'express';
import { addToWatchlist, getWatchlist, removeFromWatchlist } from '../controllers/watchlistController.js';
import { authenticate } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Secure all watchlist endpoints with JWT authentication middleware
router.use(authenticate);

// Limit watchlist queries: max 60 queries per minute per client
const watchlistLimiter = rateLimiter({
    windowMs: 60 * 1000,
    max: 60,
    message: 'Too many watchlist requests. Please try again in a minute.'
});

router.use(watchlistLimiter);

router.post('/add', addToWatchlist);
router.get('/', getWatchlist);
router.delete('/:id', removeFromWatchlist);

export default router;
