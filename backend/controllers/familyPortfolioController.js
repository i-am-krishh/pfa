import FamilyGroup from '../models/FamilyGroup.js';
import PortfolioHolding from '../models/PortfolioHolding.js';
import User from '../models/User.js';
import * as angleOneService from '../services/yahooFinanceService.js';

/**
 * GET /api/family/portfolio/:familyId
 * Returns the aggregated family portfolio, member contributions, and current valuations.
 */
export const getFamilyPortfolio = async (req, res) => {
    try {
        const { familyId } = req.params;
        const userId = req.user.userId;

        const familyGroup = await FamilyGroup.findById(familyId);
        if (!familyGroup) {
            return res.status(404).json({ success: false, message: 'Family group not found' });
        }

        // 1. Permission checks
        const isApprovedMember = familyGroup.members.some(m => m.user.toString() === userId && m.status === 'Approved');
        const isAdmin = familyGroup.admin.toString() === userId;
        
        if (!isApprovedMember && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to access this family group' });
        }

        // Check if member has access to view investments
        if (!isAdmin) {
            const member = familyGroup.members.find(m => m.user.toString() === userId);
            if (member && member.canViewInvestments === false) {
                return res.status(403).json({ success: false, message: 'Access denied: Viewing family investments is disabled for you.' });
            }
        }

        // 2. Determine who is sharing investments
        const sharingUserIds = familyGroup.members
            .filter(m => m.status === 'Approved' && m.shareInvestments)
            .map(m => m.user.toString());

        // Admin always shares
        const adminIdStr = familyGroup.admin.toString();
        if (!sharingUserIds.includes(adminIdStr)) {
            sharingUserIds.push(adminIdStr);
        }

        // 3. Retrieve all holdings for sharing members
        const holdings = await PortfolioHolding.find({ userId: { $in: sharingUserIds } }).populate('userId', 'fullName');

        // 4. Aggregate holdings by stock symbol
        const aggregatedMap = {};
        const memberContributionMap = {};

        // Pre-initialize member contribution map
        for (const uid of sharingUserIds) {
            let name = 'Admin';
            let role = 'Admin';
            if (uid !== adminIdStr) {
                const memberUser = await User.findById(uid);
                name = memberUser ? memberUser.fullName : 'Family Member';
                const memberGroupInfo = familyGroup.members.find(m => m.user.toString() === uid);
                role = memberGroupInfo ? memberGroupInfo.role : 'Contributor';
            } else {
                const adminUser = await User.findById(adminIdStr);
                name = adminUser ? adminUser.fullName : 'Admin';
            }
            memberContributionMap[uid] = {
                userId: uid,
                name,
                role,
                totalInvested: 0,
                totalCurrentValue: 0,
                profitLoss: 0,
                profitLossPercentage: 0
            };
        }

        // Process holdings
        for (const holding of holdings) {
            const sym = holding.stockSymbol;
            const cost = Number((holding.quantity * holding.buyPrice).toFixed(2));

            // Aggregation by stock
            if (!aggregatedMap[sym]) {
                aggregatedMap[sym] = {
                    stockSymbol: sym,
                    stockName: holding.stockName,
                    quantity: 0,
                    totalCost: 0,
                    holdingsDetails: []
                };
            }
            aggregatedMap[sym].quantity += holding.quantity;
            aggregatedMap[sym].totalCost += cost;
            aggregatedMap[sym].holdingsDetails.push({
                memberName: holding.userId?.fullName || 'Member',
                quantity: holding.quantity,
                buyPrice: holding.buyPrice
            });

            // Member-wise aggregation
            const uidStr = holding.userId._id.toString();
            if (memberContributionMap[uidStr]) {
                memberContributionMap[uidStr].totalInvested += cost;
            }
        }

        // 5. Fetch live quotes for all consolidated symbols in a single batch!
        const symbols = Object.keys(aggregatedMap);
        const quotes = await angleOneService.getQuotes(symbols);

        // 6. Enrich consolidated stock holdings with live quotes
        const consolidatedHoldings = Object.values(aggregatedMap).map((item) => {
            const quote = quotes[item.stockSymbol];
            const currentPrice = quote ? quote.currentPrice : (item.totalCost / item.quantity);
            const avgBuyPrice = Number((item.totalCost / item.quantity).toFixed(2));
            const currentValue = Number((item.quantity * currentPrice).toFixed(2));
            const profitLoss = Number((currentValue - item.totalCost).toFixed(2));
            const profitPercentage = item.totalCost > 0 ? Number(((profitLoss / item.totalCost) * 100).toFixed(2)) : 0;

            return {
                _id: item.stockSymbol, // Use symbol as unique id
                name: item.stockName,
                symbol: item.stockSymbol,
                type: 'stocks',
                quantity: item.quantity,
                avgBuyPrice,
                amount: item.totalCost,
                currentPrice,
                currentValue,
                profitLoss,
                profitLossPercentage: profitPercentage,
                change: quote ? quote.change : 0,
                changePercent: quote ? quote.changePercent : 0,
                holdingsDetails: item.holdingsDetails
            };
        });

        // 7. Recalculate member contribution live values
        for (const holding of holdings) {
            const uidStr = holding.userId._id.toString();
            const matchingConsolidated = consolidatedHoldings.find(c => c.symbol === holding.stockSymbol);
            if (matchingConsolidated && memberContributionMap[uidStr]) {
                const livePrice = matchingConsolidated.currentPrice;
                memberContributionMap[uidStr].totalCurrentValue += Number((holding.quantity * livePrice).toFixed(2));
            }
        }

        // Finalize contribution stats
        Object.keys(memberContributionMap).forEach(uid => {
            const m = memberContributionMap[uid];
            m.profitLoss = Number((m.totalCurrentValue - m.totalInvested).toFixed(2));
            m.profitLossPercentage = m.totalInvested > 0 ? Number(((m.profitLoss / m.totalInvested) * 100).toFixed(2)) : 0;
        });

        // 8. Calculate aggregate totals
        let totalInvested = 0;
        let totalCurrentValue = 0;

        consolidatedHoldings.forEach(item => {
            totalInvested += item.amount;
            totalCurrentValue += item.currentValue;
        });

        const totalProfitLoss = Number((totalCurrentValue - totalInvested).toFixed(2));
        const profitLossPercentage = totalInvested > 0 ? Number(((totalProfitLoss / totalInvested) * 100).toFixed(2)) : 0;

        // Build simple type allocation array for Recharts
        const allocation = [{
            type: 'stocks',
            totalCurrentValue,
            percentage: 100
        }].filter(item => item.totalCurrentValue > 0);

        res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalInvested,
                    totalCurrentValue,
                    totalProfitLoss,
                    profitLossPercentage
                },
                investments: consolidatedHoldings,
                memberContributions: Object.values(memberContributionMap),
                allocation
            }
        });

    } catch (error) {
        console.error('Error in getFamilyPortfolio:', error);
        const isDev = process.env.NODE_ENV === 'development';
        res.status(500).json({
            success: false,
            message: isDev ? error.message : 'Error fetching family portfolio'
        });
    }
};
