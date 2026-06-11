import Investment from '../models/Investment.js';
import FamilyGroup from '../models/FamilyGroup.js';
import User from '../models/User.js';
import PortfolioHolding from '../models/PortfolioHolding.js';
import * as angleOneService from '../services/yahooFinanceService.js';

// Static mapper for common tickers to industries
const COMMON_SECTORS = {
    AAPL: 'Technology',
    MSFT: 'Technology',
    NVDA: 'Technology',
    GOOGL: 'Technology',
    GOOG: 'Technology',
    AMZN: 'Consumer Discretionary',
    TSLA: 'Consumer Discretionary',
    META: 'Technology',
    NFLX: 'Technology',
    DIS: 'Communications',
    JPM: 'Finance',
    V: 'Finance',
    MA: 'Finance',
    KO: 'Consumer Staples',
    PEP: 'Consumer Staples',
    WMT: 'Consumer Staples',
    COST: 'Consumer Staples',
    BTC: 'Cryptocurrency',
    ETH: 'Cryptocurrency',
    SOL: 'Cryptocurrency',
    BTCUSD: 'Cryptocurrency',
    ETHUSD: 'Cryptocurrency',
    SPY: 'Index ETF',
    QQQ: 'Index ETF',
    DIA: 'Index ETF',
    RELIANCE: 'Energy',
    TCS: 'Technology',
    INFY: 'Technology',
    HDFCBANK: 'Finance',
    SBIN: 'Finance',
    ICICIBANK: 'Finance',
    BHARTIAIRTEL: 'Telecom',
    ITC: 'Consumer Goods',
    LT: 'Construction',
    TATAMOTORS: 'Automotive',
    NIFTY: 'Diversified Index',
    NIFTY50: 'Diversified Index'
};

/**
 * Helper to capitalize sector/type labels
 */
const capitalize = (str) => {
    if (!str) return 'Other';
    return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

/**
 * Get Consolidated Investment Analytics (Personal / Family)
 */
export const getInvestmentAnalytics = async (req, res) => {
    try {
        const { mode = 'personal', familyId } = req.query;
        const userId = req.user.userId;

        let query = {};
        let sharingUserIds = [userId];
        
        if (mode === 'family') {
            if (!familyId) {
                return res.status(400).json({ success: false, message: 'familyId is required for family mode' });
            }

            const familyGroup = await FamilyGroup.findById(familyId);
            if (!familyGroup) {
                return res.status(404).json({ success: false, message: 'Family group not found' });
            }

            // Check permissions
            const isApproved = familyGroup.members.some(m => m.user.toString() === userId && m.status === 'Approved');
            const isAdmin = familyGroup.admin.toString() === userId;
            if (!isApproved && !isAdmin) {
                return res.status(403).json({ success: false, message: 'Not authorized to view this family group' });
            }

            // Check if member has access to investments
            if (!isAdmin) {
                const member = familyGroup.members.find(m => m.user.toString() === userId);
                if (member && member.canViewInvestments === false) {
                    return res.status(403).json({ success: false, message: 'Access denied: family investments view disabled.' });
                }
            }

            // Filter members sharing investments
            sharingUserIds = familyGroup.members
                .filter(m => m.status === 'Approved' && m.shareInvestments)
                .map(m => m.user.toString());
            
            // Admin always shares
            if (!sharingUserIds.includes(familyGroup.admin.toString())) {
                sharingUserIds.push(familyGroup.admin.toString());
            }

            query = {
                $or: [
                    { familyGroupId: familyGroup._id },
                    {
                        familyGroupId: null,
                        userId: { $in: sharingUserIds },
                        'familySync.enabled': true,
                        'familySync.familyId': familyGroup._id
                    }
                ]
            };
        } else {
            // Personal Mode
            query = { userId };
        }

        // Fetch generic Investments
        const investments = await Investment.find(query).populate('userId', 'fullName');

        // Fetch custom Stock Portfolio Holdings
        const portfolioHoldings = await PortfolioHolding.find({ userId: { $in: sharingUserIds } }).populate('userId', 'fullName');
        const holdingSymbols = portfolioHoldings.map(h => h.stockSymbol);
        const quotes = await angleOneService.getQuotes(holdingSymbols);

        // Map Portfolio Holdings to unified Investment structure
        const mappedHoldings = portfolioHoldings.map(holding => {
            const quote = quotes[holding.stockSymbol];
            const currentPrice = quote ? quote.currentPrice : holding.buyPrice;
            const investedAmount = Number((holding.quantity * holding.buyPrice).toFixed(2));
            const currentValue = Number((holding.quantity * currentPrice).toFixed(2));
            
            return {
                _id: holding._id,
                userId: holding.userId,
                type: 'stocks',
                name: holding.stockName,
                symbol: holding.stockSymbol,
                amount: investedAmount,
                currentValue: currentValue,
                quantity: holding.quantity,
                pricePerUnit: holding.buyPrice,
                investmentDate: holding.purchaseDate,
                expectedReturnPercentage: 12,
                riskLevel: 'high',
                broker: holding.exchange || 'NSE',
                description: holding.notes || ''
            };
        });

        // Combine both sets of assets
        const consolidatedInvestments = [...investments, ...mappedHoldings];

        // 1. Calculate General Summary
        let totalInvested = 0;
        let totalCurrentValue = 0;

        consolidatedInvestments.forEach(inv => {
            totalInvested += inv.amount || 0;
            totalCurrentValue += inv.currentValue || 0;
        });

        const totalProfitLoss = totalCurrentValue - totalInvested;
        const profitLossPercentage = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

        // 2. Asset Allocation
        const assetMap = {};
        consolidatedInvestments.forEach(inv => {
            const type = inv.type || 'other';
            const val = inv.currentValue || 0;
            assetMap[type] = (assetMap[type] || 0) + val;
        });

        const assetAllocation = Object.keys(assetMap).map(type => {
            const val = assetMap[type];
            return {
                name: capitalize(type),
                value: val,
                percentage: totalCurrentValue > 0 ? Number(((val / totalCurrentValue) * 100).toFixed(2)) : 0
            };
        }).filter(item => item.value > 0);

        // 3. Sector Allocation
        const sectorMap = {};
        consolidatedInvestments.forEach(inv => {
            let sector = 'Other';
            if (inv.type === 'stocks' || inv.type === 'mutual_funds') {
                const sym = (inv.symbol || '').toUpperCase().trim();
                if (sym && COMMON_SECTORS[sym]) {
                    sector = COMMON_SECTORS[sym];
                } else if (inv.broker) {
                    sector = capitalize(inv.broker);
                } else {
                    sector = inv.type === 'stocks' ? 'Equity' : 'Mutual Funds';
                }
            } else {
                sector = capitalize(inv.type);
            }

            const val = inv.currentValue || 0;
            sectorMap[sector] = (sectorMap[sector] || 0) + val;
        });

        const sectorAllocation = Object.keys(sectorMap).map(name => {
            const val = sectorMap[name];
            return {
                name,
                value: val,
                percentage: totalCurrentValue > 0 ? Number(((val / totalCurrentValue) * 100).toFixed(2)) : 0
            };
        }).filter(item => item.value > 0);

        // 4. Generate 6-Month Timeline Projections (Growth & Profit/Loss) using real history
        const timelineData = [];
        const monthlyReturnsData = [];
        const monthsList = [];
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
            monthsList.push({ date: monthEnd, label });
        }

        // Fetch historical daily candles for stocks/crypto in the consolidated holdings
        const uniqueSymbols = Array.from(new Set(
            consolidatedInvestments
                .filter(inv => (inv.type === 'stocks' || inv.type === 'crypto') && inv.symbol)
                .map(inv => inv.symbol.toUpperCase().trim())
        ));

        const historicalDataMap = {};
        await Promise.all(uniqueSymbols.map(async (symbol) => {
            try {
                const hist = await angleOneService.getHistoricalData(symbol, '1day', 180);
                if (hist && hist.candles && hist.candles.length > 0) {
                    historicalDataMap[symbol] = hist.candles;
                }
            } catch (err) {
                console.warn(`[Analytics Controller] Could not fetch historical data for ${symbol}:`, err.message);
            }
        }));

        const getStockPriceAtMonthEnd = (symbol, targetDate) => {
            const candles = historicalDataMap[symbol];
            if (!candles || candles.length === 0) return null;

            let closestCandle = null;
            for (const candle of candles) {
                const candleDate = new Date(candle.timestamp);
                if (candleDate <= targetDate) {
                    if (!closestCandle || new Date(closestCandle.timestamp) < candleDate) {
                        closestCandle = candle;
                    }
                }
            }
            return closestCandle ? closestCandle.close : null;
        };

        monthsList.forEach((m, idx) => {
            let investedSum = 0;
            let currentSum = 0;

            consolidatedInvestments.forEach(inv => {
                const purchaseDate = new Date(inv.investmentDate);
                if (purchaseDate <= m.date) {
                    const cost = inv.amount || 0;
                    const endValue = inv.currentValue || 0;
                    
                    investedSum += cost;

                    if (inv.type === 'stocks' || inv.type === 'crypto') {
                        const sym = (inv.symbol || '').toUpperCase().trim();
                        const histPrice = getStockPriceAtMonthEnd(sym, m.date);
                        if (histPrice !== null && inv.quantity > 0) {
                            currentSum += inv.quantity * histPrice;
                        } else {
                            const todayDiffMs = now - purchaseDate;
                            const totalElapsed = Math.max(1, Math.floor(todayDiffMs / (30 * 24 * 60 * 60 * 1000)));
                            const diffMs = m.date - purchaseDate;
                            const elapsedMonths = Math.max(0, Math.floor(diffMs / (30 * 24 * 60 * 60 * 1000)));

                            if (elapsedMonths >= totalElapsed) {
                                currentSum += endValue;
                            } else {
                                const ratio = endValue / (cost || 1);
                                const avgMonthlyRate = Math.pow(ratio, 1 / totalElapsed);
                                currentSum += cost * Math.pow(avgMonthlyRate, elapsedMonths);
                            }
                        }
                    } else {
                        const todayDiffMs = now - purchaseDate;
                        const totalElapsed = Math.max(1, Math.floor(todayDiffMs / (30 * 24 * 60 * 60 * 1000)));
                        const diffMs = m.date - purchaseDate;
                        const elapsedMonths = Math.max(0, Math.floor(diffMs / (30 * 24 * 60 * 60 * 1000)));

                        if (elapsedMonths >= totalElapsed) {
                            currentSum += endValue;
                        } else {
                            const ratio = endValue / (cost || 1);
                            const avgMonthlyRate = Math.pow(ratio, 1 / totalElapsed);
                            currentSum += cost * Math.pow(avgMonthlyRate, elapsedMonths);
                        }
                    }
                }
            });

            const plVal = currentSum - investedSum;
            const plPercent = investedSum > 0 ? (plVal / investedSum) * 100 : 0;

            timelineData.push({
                name: m.label,
                invested: Math.round(investedSum),
                value: Math.round(currentSum),
                profitLoss: Math.round(plVal),
                profitLossPercent: Number(plPercent.toFixed(2))
            });
        });

        // 5. Monthly Returns (MoM Growth %)
        for (let idx = 0; idx < timelineData.length; idx++) {
            const currentMonth = timelineData[idx];
            let rate = 0;
            let valDiff = 0;

            if (idx === 0) {
                rate = currentMonth.invested > 0 ? (currentMonth.profitLoss / currentMonth.invested) * 100 : 0;
                valDiff = currentMonth.profitLoss;
            } else {
                const prevMonth = timelineData[idx - 1];
                if (prevMonth.value > 0) {
                    valDiff = currentMonth.value - prevMonth.value;
                    rate = (valDiff / prevMonth.value) * 100;
                }
            }

            monthlyReturnsData.push({
                name: currentMonth.name,
                returns: Number(rate.toFixed(2)),
                amount: valDiff
            });
        }

        res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalInvested,
                    totalCurrentValue,
                    totalProfitLoss,
                    profitLossPercentage
                },
                assetAllocation,
                sectorAllocation,
                portfolioGrowth: timelineData,
                monthlyReturns: monthlyReturnsData
            }
        });

    } catch (error) {
        console.error('Error in getInvestmentAnalytics:', error);
        const isDev = process.env.NODE_ENV === 'development';
        res.status(500).json({
            success: false,
            message: isDev ? error.message : 'Error compiling investment analytics. Please try again later.'
        });
    }
};
