import * as twelveDataService from '../services/yahooFinanceService.js';

// Helper to calculate Indian Stock Market status
const getMarketStatus = () => {
    const now = new Date();
    // Offset local node server time to IST (UTC + 5:30)
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istTime = new Date(utcTime + (3600000 * 5.5));
    
    const day = istTime.getDay(); // 0 is Sunday, 6 is Saturday
    const hours = istTime.getHours();
    const minutes = istTime.getMinutes();
    const timeVal = hours * 100 + minutes; // Format: HHMM, e.g. 0915
    
    const isWeekend = (day === 0 || day === 6);
    const isOpenHours = (timeVal >= 915 && timeVal <= 1530);
    
    return (!isWeekend && isOpenHours) ? 'OPEN' : 'CLOSED';
};

/**
 * GET /api/market/overview
 * Returns the current market indices (NIFTY 50, SENSEX, BANK NIFTY, NIFTY IT, NIFTY AUTO, NIFTY FMCG, NIFTY PHARMA)
 */
export const getMarketOverview = async (req, res) => {
    try {
        const overview = await twelveDataService.getMarketIndices();
        res.status(200).json({
            success: true,
            marketStatus: getMarketStatus(),
            data: overview
        });
    } catch (error) {
        console.error('Error in getMarketOverview controller:', error);
        const isDev = process.env.NODE_ENV === 'development';
        res.status(500).json({
            success: false,
            message: isDev ? error.message : 'Error fetching Indian market overview'
        });
    }
};
