import YahooFinanceClass from 'yahoo-finance2';
const yahooFinance = new YahooFinanceClass();
import MarketCache from '../models/MarketCache.js';
import HistoryCache from '../models/HistoryCache.js';

// Symbol mapping tables
const YAHOO_SYMBOL_MAPPING = {
    RELIANCE: 'RELIANCE.NS',
    TCS: 'TCS.NS',
    INFY: 'INFY.NS',
    HDFCBANK: 'HDFCBANK.NS',
    SBIN: 'SBIN.NS',
    ITC: 'ITC.NS',
    TATASTEEL: 'TATASTEEL.NS',
    BAJAJFINSV: 'BAJAJFINSV.NS'
};

const INDEX_MAPPING = {
    '^NSEI': '^NSEI', // NIFTY 50
    '^BSESN': '^BSESN', // SENSEX
    '^NSEBANK': '^NSEBANK', // BANK NIFTY
    '^CNXIT': '^CNXIT', // NIFTY IT
    '^CNXAUTO': '^CNXAUTO', // NIFTY AUTO
    '^CNXFMCG': '^CNXFMCG', // NIFTY FMCG
    '^CNXPHARMA': '^CNXPHARMA' // NIFTY PHARMA
};

// Backward-compatible TOKEN_MAPPING stub so that controllers calling it won't crash
export const TOKEN_MAPPING = {
    RELIANCE: { token: '2885', name: 'RELIANCE INDUSTRIES LTD', exchange: 'NSE' },
    TCS: { token: '11536', name: 'TATA CONSULTANCY SERVICES LTD', exchange: 'NSE' },
    INFY: { token: '1594', name: 'INFOSYS LTD', exchange: 'NSE' },
    HDFCBANK: { token: '1333', name: 'HDFC BANK LTD', exchange: 'NSE' },
    SBIN: { token: '3045', name: 'STATE BANK OF INDIA', exchange: 'NSE' },
    ITC: { token: '1660', name: 'ITC LTD', exchange: 'NSE' },
    TATASTEEL: { token: '3499', name: 'TATA STEEL LTD', exchange: 'NSE' },
    BAJAJFINSV: { token: '16675', name: 'BAJAJ FINSERV LTD', exchange: 'NSE' }
};

/**
 * Maps a symbol to Yahoo Finance standard.
 */
export function mapSymbolToYahoo(symbol) {
    if (!symbol) return '';
    let clean = symbol.trim().toUpperCase();

    // Check if it's a mapped index
    if (INDEX_MAPPING[clean]) {
        return INDEX_MAPPING[clean];
    }

    // Check direct mapping table
    if (YAHOO_SYMBOL_MAPPING[clean]) {
        return YAHOO_SYMBOL_MAPPING[clean];
    }

    // If starts with ^ or contains a dot, return as is
    if (clean.startsWith('^') || clean.includes('.')) {
        return clean;
    }

    // Default to NSE for Indian stocks
    return `${clean}.NS`;
}

/**
 * Strips the extension for consistent client-side display.
 */
export function mapSymbolFromYahoo(yahooSymbol) {
    if (!yahooSymbol) return '';
    let clean = yahooSymbol.trim().toUpperCase();

    if (clean.endsWith('.NS') || clean.endsWith('.BO')) {
        return clean.substring(0, clean.length - 3);
    }

    return clean;
}

/**
 * Fetch a single quote from Yahoo Finance (with MongoDB caching)
 */
export async function getStockQuote(symbol) {
    if (!symbol) throw new Error('Symbol is required');
    const localSymbol = symbol.trim().toUpperCase();
    const yahooSymbol = mapSymbolToYahoo(localSymbol);
    const cacheDuration = 60 * 1000; // 60 seconds

    // 1. Try cache first
    try {
        const cached = await MarketCache.findOne({ symbol: localSymbol });
        if (cached && (Date.now() - new Date(cached.lastUpdated).getTime()) < cacheDuration) {
            return {
                symbol: localSymbol,
                yahooSymbol,
                companyName: cached.companyName || localSymbol,
                currentPrice: cached.currentPrice,
                previousClose: cached.previousClose || cached.currentPrice,
                open: cached.open || cached.currentPrice,
                dayHigh: cached.dayHigh || cached.currentPrice,
                dayLow: cached.dayLow || cached.currentPrice,
                volume: cached.volume || 0,
                marketCap: cached.marketCap || 0,
                peRatio: cached.peRatio || 0,
                currency: cached.currency || 'INR',
                exchange: cached.exchange || 'NSE',
                timestamp: cached.lastUpdated,
                change: cached.change || 0,
                changePercent: cached.changePercent || 0,
                fiftyTwoWeekHigh: cached.fiftyTwoWeekHigh || cached.currentPrice,
                fiftyTwoWeekLow: cached.fiftyTwoWeekLow || cached.currentPrice,
                cacheUsed: true
            };
        }
    } catch (err) {
        console.warn(`[YahooFinanceService] Cache read failed for ${localSymbol}:`, err.message);
    }

    // 2. Fetch from network
    try {
        const quote = await yahooFinance.quote(yahooSymbol);
        if (!quote) {
            throw new Error(`Symbol not found on Yahoo Finance: ${yahooSymbol}`);
        }

        const result = {
            symbol: localSymbol,
            yahooSymbol,
            companyName: quote.longName || quote.shortName || quote.displayName || localSymbol,
            currentPrice: quote.regularMarketPrice || quote.regularMarketPreviousClose || 0,
            previousClose: quote.regularMarketPreviousClose || quote.regularMarketPrice || 0,
            open: quote.regularMarketOpen || quote.regularMarketPrice || 0,
            dayHigh: quote.regularMarketDayHigh || quote.regularMarketPrice || 0,
            dayLow: quote.regularMarketDayLow || quote.regularMarketPrice || 0,
            volume: quote.regularMarketVolume || 0,
            marketCap: quote.marketCap || 0,
            peRatio: quote.trailingPE || quote.forwardPE || 0,
            currency: quote.currency || 'INR',
            exchange: quote.exchange || 'NSE',
            timestamp: quote.regularMarketTime ? new Date(quote.regularMarketTime) : new Date(),
            change: quote.regularMarketChange || 0,
            changePercent: quote.regularMarketChangePercent || 0,
            fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || quote.regularMarketPrice || 0,
            fiftyTwoWeekLow: quote.fiftyTwoWeekLow || quote.regularMarketPrice || 0,
            cacheUsed: false
        };

        // Save to cache
        try {
            await MarketCache.findOneAndUpdate(
                { symbol: localSymbol },
                {
                    currentPrice: result.currentPrice,
                    dayHigh: result.dayHigh,
                    dayLow: result.dayLow,
                    volume: result.volume,
                    change: result.change,
                    changePercent: result.changePercent,
                    marketCap: result.marketCap,
                    peRatio: result.peRatio,
                    fiftyTwoWeekHigh: result.fiftyTwoWeekHigh,
                    fiftyTwoWeekLow: result.fiftyTwoWeekLow,
                    lastUpdated: new Date()
                },
                { upsert: true, new: true }
            );
        } catch (err) {
            console.warn(`[YahooFinanceService] Cache update failed for ${localSymbol}:`, err.message);
        }

        return result;
    } catch (error) {
        console.error(`[YahooFinanceService] Fetch quote error for ${yahooSymbol}:`, error.message);
        throw new Error('Live Data Unavailable');
    }
}

/**
 * Fetch quotes for multiple symbols in parallel (safe with caching)
 */
export async function getQuotes(symbols) {
    if (!symbols || symbols.length === 0) return {};
    const symbolsArray = Array.isArray(symbols) ? symbols : [symbols];
    const results = {};

    await Promise.all(symbolsArray.map(async (sym) => {
        try {
            const quote = await getStockQuote(sym);
            results[sym.trim().toUpperCase()] = quote;
        } catch (err) {
            console.warn(`[YahooFinanceService] Batch quote item failed for ${sym}:`, err.message);
        }
    }));

    return results;
}

/**
 * Fetch historical data for a symbol (intraday or daily)
 */
export async function getHistoricalData(symbol, range = '1M') {
    if (!symbol) throw new Error('Symbol is required');
    const localSymbol = symbol.trim().toUpperCase();
    const yahooSymbol = mapSymbolToYahoo(localSymbol);

    const now = new Date();
    let startDate;
    let interval = '1d';
    let useChart = false;

    switch (range) {
        case '1D':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            interval = '5m';
            useChart = true;
            break;
        case '1W':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            interval = '30m';
            useChart = true;
            break;
        case '1M':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            interval = '1d';
            break;
        case '3M':
            startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
            interval = '1d';
            break;
        case '6M':
            startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
            interval = '1d';
            break;
        case '1Y':
            startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            interval = '1d';
            break;
        case '5Y':
            startDate = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
            interval = '1d';
            break;
        default:
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            interval = '1d';
    }

    try {
        if (useChart) {
            const chartData = await yahooFinance.chart(yahooSymbol, {
                period1: startDate,
                interval
            });
            return (chartData.quotes || [])
                .filter(q => q.close !== null && q.close !== undefined)
                .map(q => ({
                    date: q.date.toISOString(),
                    time: q.date.toISOString().split('T')[0], // support time label in recharts
                    open: q.open || q.close,
                    high: q.high || q.close,
                    low: q.low || q.close,
                    close: q.close,
                    volume: q.volume || 0
                }));
        } else {
            const histData = await yahooFinance.historical(yahooSymbol, {
                period1: startDate,
                interval
            });
            return histData
                .filter(h => h.close !== null && h.close !== undefined)
                .map(h => ({
                    date: h.date.toISOString().split('T')[0],
                    time: h.date.toISOString().split('T')[0], // support time label in recharts
                    open: h.open || h.close,
                    high: h.high || h.close,
                    low: h.low || h.close,
                    close: h.close,
                    volume: h.volume || 0
                }));
        }
    } catch (error) {
        console.error(`[YahooFinanceService] Historical fetch failed for ${yahooSymbol}:`, error.message);
        throw new Error('Live Data Unavailable');
    }
}

/**
 * Fetch company profile
 */
export async function getCompanyProfile(symbol) {
    if (!symbol) throw new Error('Symbol is required');
    const localSymbol = symbol.trim().toUpperCase();
    const yahooSymbol = mapSymbolToYahoo(localSymbol);

    try {
        const summary = await yahooFinance.quoteSummary(yahooSymbol, {
            modules: ['summaryProfile']
        });
        const profile = summary.summaryProfile || {};
        return {
            symbol: localSymbol,
            companyName: profile.longName || profile.shortName || localSymbol,
            sector: profile.sector || 'Equity',
            industry: profile.industry || 'Other',
            website: profile.website || '',
            longBusinessSummary: profile.longBusinessSummary || ''
        };
    } catch (error) {
        console.error(`[YahooFinanceService] Profile fetch failed for ${yahooSymbol}:`, error.message);
        throw new Error('Live Data Unavailable');
    }
}

/**
 * Get market overview indices and calculate top movers
 */
export async function getMarketSummary() {
    const indicesList = ['^NSEI', '^BSESN', '^NSEBANK', '^CNXIT', '^CNXAUTO', '^CNXFMCG', '^CNXPHARMA'];
    const INDEX_NAMES = {
        '^NSEI': 'NIFTY 50',
        '^BSESN': 'SENSEX',
        '^NSEBANK': 'BANK NIFTY',
        '^CNXIT': 'NIFTY IT',
        '^CNXAUTO': 'NIFTY AUTO',
        '^CNXFMCG': 'NIFTY FMCG',
        '^CNXPHARMA': 'NIFTY PHARMA'
    };

    try {
        const quotes = await getQuotes(indicesList);
        return indicesList.map((symbol) => {
            const quote = quotes[symbol];
            return {
                symbol,
                name: INDEX_NAMES[symbol] || symbol.replace('^', ''),
                currentValue: quote ? quote.currentPrice : null,
                change: quote ? quote.change : null,
                percentageChange: quote ? quote.changePercent : null,
                dayHigh: quote ? quote.dayHigh : null,
                dayLow: quote ? quote.dayLow : null
            };
        });
    } catch (error) {
        console.error('[YahooFinanceService] Market summary failed:', error.message);
        throw new Error('Live Data Unavailable');
    }
}

/**
 * Dynamic indicators calculations
 */
export function calculateSMA(candles, period = 20) {
    if (!candles || candles.length < period) return null;
    const slice = candles.slice(-period);
    const sum = slice.reduce((acc, c) => acc + c.close, 0);
    return Number((sum / period).toFixed(2));
}

export function calculateRSI(candles, period = 14) {
    if (!candles || candles.length <= period) return null;

    const changes = [];
    for (let i = 1; i < candles.length; i++) {
        changes.push(candles[i].close - candles[i - 1].close);
    }

    let gains = 0;
    let losses = 0;

    for (let i = 0; i < period; i++) {
        const change = changes[i];
        if (change > 0) gains += change;
        else losses += Math.abs(change);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period; i < changes.length; i++) {
        const change = changes[i];
        const currentGain = change > 0 ? change : 0;
        const currentLoss = change < 0 ? Math.abs(change) : 0;

        avgGain = (avgGain * (period - 1) + currentGain) / period;
        avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    return Number(rsi.toFixed(2));
}

// ==========================================
// Compatibility layer for other components
// ==========================================

export async function searchStocks(query) {
    if (!query) return [];
    try {
        const results = await yahooFinance.search(query);
        return (results.quotes || [])
            .filter(item => item.quoteType === 'EQUITY' && (item.exchange === 'NSI' || item.exchange === 'BSE' || item.symbol.endsWith('.NS') || item.symbol.endsWith('.BO')))
            .map(item => ({
                symbol: mapSymbolFromYahoo(item.symbol),
                companyName: item.longname || item.shortname || item.symbol,
                exchange: item.exchange === 'NSI' ? 'NSE' : (item.exchange || 'NSE'),
                sector: item.sector || 'Equity'
            }));
    } catch (err) {
        console.error('[YahooFinanceService] searchStocks failed:', err.message);
        return [];
    }
}

export const searchInstruments = searchStocks;

export async function getQuote(symbol) {
    return await getStockQuote(symbol);
}

export async function getPrice(symbol) {
    const quote = await getStockQuote(symbol);
    return quote.currentPrice;
}

export async function getTechnicalIndicators(symbol, interval = '1day') {
    try {
        // Fetch last 35 candles to ensure we have enough data for 14-period RSI and 20-period SMA calculations
        const candles = await getHistoricalData(symbol, '1M');
        const rsi = calculateRSI(candles, 14);
        const sma = calculateSMA(candles, 20);
        return {
            symbol: symbol.trim().toUpperCase(),
            rsi,
            sma,
            timestamp: new Date()
        };
    } catch (err) {
        console.warn(`[YahooFinanceService] Indicators failed for ${symbol}:`, err.message);
        return {
            symbol: symbol.trim().toUpperCase(),
            rsi: null,
            sma: null,
            timestamp: new Date()
        };
    }
}

export async function getMarketIndices() {
    return await getMarketSummary();
}

export async function diagnoseStock(symbol) {
    const localSymbol = symbol.trim().toUpperCase();
    const yahooSymbol = mapSymbolToYahoo(localSymbol);
    const errors = [];
    let rawResponse = null;
    let transformedResponse = null;

    try {
        rawResponse = await yahooFinance.quote(yahooSymbol);
        transformedResponse = await getStockQuote(localSymbol);
    } catch (err) {
        errors.push(err.message);
    }

    return {
        provider: "Yahoo Finance",
        apiProvider: "Yahoo Finance",
        symbol: localSymbol,
        yahooSymbol,
        rawResponse,
        transformedResponse,
        cacheUsed: transformedResponse?.cacheUsed || false,
        timestamp: new Date().toISOString(),
        errors: errors.length > 0 ? errors : null
    };
}

export function enrichStatusFields(quote) {
    return quote;
}

export async function getMarketNews() {
    try {
        const results = await yahooFinance.search('NIFTY 50', { newsCount: 10 });
        return (results.news || []).map(item => ({
            id: item.uuid,
            headline: item.title,
            source: item.publisher,
            datetime: new Date(item.providerPublishTime * 1000),
            summary: item.title,
            url: item.link,
            image: ''
        }));
    } catch (err) {
        console.error('[YahooFinanceService] Failed to fetch news:', err.message);
        throw new Error('Live Data Unavailable');
    }
}
