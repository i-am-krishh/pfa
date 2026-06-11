import * as yahooFinanceService from '../services/yahooFinanceService.js';

/**
 * GET /api/stocks/search?q=
 * Search stock by company name or ticker symbol.
 */
export const searchStocks = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ success: false, message: 'Query parameter q is required' });
        }

        const results = await yahooFinanceService.searchStocks(q);
        res.status(200).json({
            success: true,
            results
        });
    } catch (error) {
        console.error('Error in searchStocks controller:', error);
        res.status(500).json({
            success: false,
            message: 'Live Data Unavailable'
        });
    }
};

/**
 * GET /api/stocks/quote/:symbol
 * Return quote details wrapped in a data object (for frontend compatibility)
 */
export const getStockQuote = async (req, res) => {
    try {
        const { symbol } = req.params;
        if (!symbol) {
            return res.status(400).json({ success: false, message: 'Symbol parameter is required' });
        }

        const quote = await yahooFinanceService.getStockQuote(symbol);
        res.status(200).json({
            success: true,
            data: {
                currentPrice: quote.currentPrice,
                currentPriceStatus: null,
                marketCap: quote.marketCap,
                marketCapStatus: null,
                volume: quote.volume,
                volumeStatus: null,
                peRatio: quote.peRatio,
                peRatioStatus: null,
                dayHigh: quote.dayHigh,
                dayHighStatus: null,
                dayLow: quote.dayLow,
                dayLowStatus: null,
                fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
                fiftyTwoWeekHighStatus: null,
                fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
                fiftyTwoWeekLowStatus: null,
                open: quote.open,
                close: quote.previousClose,
                high: quote.dayHigh,
                low: quote.dayLow,
                change: quote.change,
                changePercent: quote.changePercent
            }
        });
    } catch (error) {
        console.error(`Error in getStockQuote controller for ${req.params.symbol}:`, error);
        res.status(500).json({
            success: false,
            message: 'Live Data Unavailable'
        });
    }
};

/**
 * GET /api/stocks/history/:symbol
 * Return historical series wrapped in a data object (for frontend compatibility)
 */
export const getStockHistory = async (req, res) => {
    try {
        const { symbol } = req.params;
        const { range } = req.query;

        if (!symbol) {
            return res.status(400).json({ success: false, message: 'Symbol parameter is required' });
        }

        const candles = await yahooFinanceService.getHistoricalData(symbol, range || '1M');
        res.status(200).json({
            success: true,
            symbol: symbol.toUpperCase(),
            data: candles
        });
    } catch (error) {
        console.error(`Error in getStockHistory controller for ${req.params.symbol}:`, error);
        res.status(500).json({
            success: false,
            message: 'Live Data Unavailable'
        });
    }
};

/**
 * GET /api/stocks/technical/:symbol
 */
export const getStockTechnicalIndicators = async (req, res) => {
    try {
        const { symbol } = req.params;
        if (!symbol) {
            return res.status(400).json({ success: false, message: 'Symbol parameter is required' });
        }

        const indicators = await yahooFinanceService.getTechnicalIndicators(symbol);
        res.status(200).json({
            success: true,
            data: indicators
        });
    } catch (error) {
        console.error(`Error in getStockTechnicalIndicators controller for ${req.params.symbol}:`, error);
        res.status(500).json({
            success: false,
            message: 'Live Data Unavailable'
        });
    }
};

/**
 * GET /api/stocks/trending
 * Return top Indian gainers and losers
 */
export const getTrendingStocks = async (req, res) => {
    try {
        const gainersCandidates = ['RELIANCE', 'SBIN', 'LT', 'BHARTIAIRTEL', 'INFY'];
        const losersCandidates = ['TCS', 'ICICIBANK', 'ITC', 'TATAMOTORS', 'HDFCBANK'];
        const allCandidates = gainersCandidates.concat(losersCandidates);

        const quotes = await yahooFinanceService.getQuotes(allCandidates);

        const buildTrendingList = (symbols) => {
            return symbols.map(symbol => {
                const quote = quotes[symbol];
                if (!quote) return null;
                return {
                    symbol,
                    name: quote.companyName || symbol,
                    price: quote.currentPrice,
                    change: quote.change,
                    changePercent: quote.changePercent
                };
            }).filter(Boolean);
        };

        const gainers = buildTrendingList(gainersCandidates).sort((a, b) => b.changePercent - a.changePercent);
        const losers = buildTrendingList(losersCandidates).sort((a, b) => a.changePercent - b.changePercent);

        res.status(200).json({
            success: true,
            data: { gainers, losers }
        });
    } catch (error) {
        console.error('Error in getTrendingStocks controller:', error);
        res.status(500).json({
            success: false,
            message: 'Live Data Unavailable'
        });
    }
};

/**
 * GET /api/stocks/news
 * Return latest real financial news
 */
export const getMarketNews = async (req, res) => {
    try {
        const news = await yahooFinanceService.getMarketNews();
        res.status(200).json({
            success: true,
            data: news
        });
    } catch (error) {
        console.error('Error in getMarketNews controller:', error);
        res.status(500).json({
            success: false,
            message: 'Live Data Unavailable'
        });
    }
};

/**
 * GET /api/debug/stock/:symbol
 * Return diagnostic report
 */
export const debugStockQuote = async (req, res) => {
    try {
        const { symbol } = req.params;
        const report = await yahooFinanceService.diagnoseStock(symbol);
        res.status(200).json({ success: true, ...report });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * STEP 5 - STOCK DETAILS FLAT API
 * GET /api/stocks/:symbol
 */
export const getStockDetailsFlat = async (req, res) => {
    try {
        const { symbol } = req.params;
        if (!symbol) {
            return res.status(400).json({ error: 'Symbol parameter is required' });
        }

        const quote = await yahooFinanceService.getStockQuote(symbol);
        res.status(200).json({
            symbol: quote.symbol,
            companyName: quote.companyName,
            currentPrice: quote.currentPrice,
            previousClose: quote.previousClose,
            open: quote.open,
            dayHigh: quote.dayHigh,
            dayLow: quote.dayLow,
            volume: quote.volume,
            marketCap: quote.marketCap,
            peRatio: quote.peRatio,
            currency: quote.currency,
            exchange: quote.exchange,
            timestamp: quote.timestamp
        });
    } catch (error) {
        console.error(`Error in getStockDetailsFlat for ${req.params.symbol}:`, error.message);
        res.status(500).json({ error: 'Live Data Unavailable' });
    }
};

/**
 * STEP 6 - HISTORICAL DATA FLAT API
 * GET /api/stocks/:symbol/history
 */
export const getStockHistoryFlat = async (req, res) => {
    try {
        const { symbol } = req.params;
        const { range } = req.query;
        if (!symbol) {
            return res.status(400).json({ error: 'Symbol parameter is required' });
        }

        const candles = await yahooFinanceService.getHistoricalData(symbol, range || '1M');
        const formatted = candles.map(c => ({
            date: c.date,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume
        }));
        res.status(200).json(formatted);
    } catch (error) {
        console.error(`Error in getStockHistoryFlat for ${req.params.symbol}:`, error.message);
        res.status(500).json({ error: 'Live Data Unavailable' });
    }
};
