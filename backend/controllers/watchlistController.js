import Watchlist from '../models/Watchlist.js';
import * as angleOneService from '../services/yahooFinanceService.js';

/**
 * POST /api/watchlist/add
 * Add stock to watchlist with automatic token lookup
 */
export const addToWatchlist = async (req, res) => {
    try {
        const { symbol, companyName, market, exchange, token } = req.body;

        if (!symbol || !companyName) {
            return res.status(400).json({
                success: false,
                message: 'symbol and companyName fields are required'
            });
        }

        const uppercaseSymbol = symbol.trim().toUpperCase();
        const checkExchange = (exchange || market || 'NSE').trim().toUpperCase();

        // 1. Resolve token if not provided
        let resolvedToken = token;
        if (!resolvedToken) {
            const mapping = angleOneService.TOKEN_MAPPING[uppercaseSymbol];
            if (mapping) {
                resolvedToken = mapping.token;
            } else {
                try {
                    const scrips = await angleOneService.searchInstruments(uppercaseSymbol);
                    const matchingScrip = scrips.find(s => s.symbol === uppercaseSymbol);
                    if (matchingScrip) {
                        resolvedToken = matchingScrip.token;
                    }
                } catch (e) {
                    console.warn(`[Watchlist Controller] Token search failed for ${uppercaseSymbol}:`, e.message);
                }
            }
        }

        // Check if already watchlisted by this user
        const existing = await Watchlist.findOne({
            userId: req.user.userId,
            symbol: uppercaseSymbol
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'This symbol is already in your watchlist'
            });
        }

        const watchlistEntry = new Watchlist({
            userId: req.user.userId,
            symbol: uppercaseSymbol,
            companyName: companyName.trim(),
            market: checkExchange,
            exchange: checkExchange,
            token: resolvedToken
        });

        await watchlistEntry.save();

        res.status(201).json({
            success: true,
            message: 'Stock added to watchlist successfully',
            data: watchlistEntry
        });
    } catch (error) {
        console.error('Error in addToWatchlist:', error);
        const isDev = process.env.NODE_ENV === 'development';
        res.status(500).json({
            success: false,
            message: isDev ? error.message : 'Error adding stock to watchlist'
        });
    }
};

/**
 * GET /api/watchlist
 * Retrieve user's watchlist, auto-enriching with live price details using batch quotes
 */
export const getWatchlist = async (req, res) => {
    try {
        const watchlistItems = await Watchlist.find({ userId: req.user.userId });
        const symbols = watchlistItems.map(item => item.symbol);

        // Fetch quotes for all watchlisted items in one single batch!
        const quotes = await angleOneService.getQuotes(symbols);

        const enrichedItems = watchlistItems.map((item) => {
            const quote = quotes[item.symbol];
            return {
                _id: item._id,
                symbol: item.symbol,
                companyName: item.companyName,
                market: item.market || item.exchange,
                exchange: item.exchange || item.market,
                token: item.token || (angleOneService.TOKEN_MAPPING[item.symbol]?.token),
                addedAt: item.addedAt || item.createdAt,
                createdAt: item.createdAt || item.addedAt,
                currentPrice: quote ? quote.currentPrice : null,
                change: quote ? quote.change : null,
                changePercent: quote ? quote.changePercent : null
            };
        });

        res.status(200).json({
            success: true,
            data: enrichedItems
        });
    } catch (error) {
        console.error('Error in getWatchlist:', error);
        const isDev = process.env.NODE_ENV === 'development';
        res.status(500).json({
            success: false,
            message: isDev ? error.message : 'Error fetching watchlist'
        });
    }
};

/**
 * DELETE /api/watchlist/:id
 * Remove stock from watchlist (only owner is authorized)
 */
export const removeFromWatchlist = async (req, res) => {
    try {
        const { id } = req.params;

        const watchlistEntry = await Watchlist.findById(id);
        if (!watchlistEntry) {
            return res.status(404).json({
                success: false,
                message: 'Watchlist entry not found'
            });
        }

        // Security Guard: Ensure authenticated user owns the watchlist item
        if (watchlistEntry.userId.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to remove this item'
            });
        }

        await Watchlist.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Stock removed from watchlist successfully'
        });
    } catch (error) {
        console.error('Error in removeFromWatchlist:', error);
        const isDev = process.env.NODE_ENV === 'development';
        res.status(500).json({
            success: false,
            message: isDev ? error.message : 'Error removing stock from watchlist'
        });
    }
};
