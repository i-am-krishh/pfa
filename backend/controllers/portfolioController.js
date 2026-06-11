import PortfolioHolding from '../models/PortfolioHolding.js';
import * as angleOneService from '../services/yahooFinanceService.js';

/**
 * Helper to resolve token and exchange for a stock symbol
 */
async function resolveTokenAndExchange(symbol, exchange, token) {
    const uppercaseSymbol = symbol.trim().toUpperCase();
    const checkExchange = (exchange || 'NSE').trim().toUpperCase();
    
    let checkToken = token;
    if (!checkToken) {
        const mapping = angleOneService.TOKEN_MAPPING[uppercaseSymbol];
        if (mapping) {
            checkToken = mapping.token;
        } else {
            try {
                const scrips = await angleOneService.searchInstruments(uppercaseSymbol);
                const matchingScrip = scrips.find(s => s.symbol === uppercaseSymbol);
                if (matchingScrip) {
                    checkToken = matchingScrip.token;
                }
            } catch (e) {
                console.warn(`[Portfolio Controller] Token search failed for ${uppercaseSymbol}:`, e.message);
            }
        }
    }
    
    return { token: checkToken, exchange: checkExchange };
}

/**
 * POST /api/portfolio/buy
 * Record a buy transaction (adds a new holding or increments quantity)
 */
export const buyHolding = async (req, res) => {
    try {
        const { stockSymbol, symbol, stockName, quantity, buyPrice, purchaseDate, notes, exchange, token } = req.body;
        const userId = req.user.userId;

        const targetSymbol = (stockSymbol || symbol || '').trim().toUpperCase();
        if (!targetSymbol || !stockName || !quantity || !buyPrice) {
            return res.status(400).json({
                success: false,
                message: 'stockSymbol (or symbol), stockName, quantity, and buyPrice are required.'
            });
        }

        const { token: resolvedToken, exchange: resolvedExchange } = await resolveTokenAndExchange(targetSymbol, exchange, token);

        // Check if user already holds this stock
        let holding = await PortfolioHolding.findOne({ userId, stockSymbol: targetSymbol });

        if (holding) {
            // Recalculate average buy price: weighted average
            const totalCost = (holding.quantity * holding.buyPrice) + (Number(quantity) * Number(buyPrice));
            const totalQuantity = holding.quantity + Number(quantity);
            
            holding.buyPrice = Number((totalCost / totalQuantity).toFixed(2));
            holding.quantity = totalQuantity;
            holding.token = resolvedToken || holding.token;
            holding.exchange = resolvedExchange || holding.exchange;
            holding.updatedAt = Date.now();
            if (notes) holding.notes = notes;
            await holding.save();
        } else {
            holding = new PortfolioHolding({
                userId,
                stockSymbol: targetSymbol,
                symbol: targetSymbol,
                stockName: stockName.trim(),
                quantity: Number(quantity),
                buyPrice: Number(buyPrice),
                purchaseDate: purchaseDate || Date.now(),
                token: resolvedToken,
                exchange: resolvedExchange,
                notes
            });
            await holding.save();
        }

        res.status(201).json({
            success: true,
            message: `Successfully bought ${quantity} shares of ${targetSymbol}`,
            holding
        });
    } catch (error) {
        console.error('Error in buyHolding:', error);
        const isDev = process.env.NODE_ENV === 'development';
        res.status(500).json({
            success: false,
            message: isDev ? error.message : 'Error processing buy transaction'
        });
    }
};

/**
 * POST /api/portfolio/sell
 * Record a sell transaction (decrements quantity or deletes if quantity reaches 0)
 */
export const sellHolding = async (req, res) => {
    try {
        const { stockSymbol, symbol, quantity } = req.body;
        const userId = req.user.userId;

        const targetSymbol = (stockSymbol || symbol || '').trim().toUpperCase();
        if (!targetSymbol || !quantity) {
            return res.status(400).json({
                success: false,
                message: 'stockSymbol (or symbol) and quantity are required.'
            });
        }

        const sellQty = Number(quantity);
        const holding = await PortfolioHolding.findOne({ userId, stockSymbol: targetSymbol });
        if (!holding) {
            return res.status(404).json({
                success: false,
                message: `No holdings found for stock: ${targetSymbol}`
            });
        }

        if (holding.quantity < sellQty) {
            return res.status(400).json({
                success: false,
                message: `Insufficient quantity. You hold ${holding.quantity} shares, but tried to sell ${sellQty}`
            });
        }

        holding.quantity -= sellQty;
        holding.updatedAt = Date.now();

        if (holding.quantity === 0) {
            await PortfolioHolding.findByIdAndDelete(holding._id);
            return res.status(200).json({
                success: true,
                message: `Successfully sold all shares of ${targetSymbol}. Holding removed.`
            });
        } else {
            await holding.save();
        }

        res.status(200).json({
            success: true,
            message: `Successfully sold ${sellQty} shares of ${targetSymbol}`,
            holding
        });
    } catch (error) {
        console.error('Error in sellHolding:', error);
        const isDev = process.env.NODE_ENV === 'development';
        res.status(500).json({
            success: false,
            message: isDev ? error.message : 'Error processing sell transaction'
        });
    }
};

/**
 * POST /api/portfolio
 * Standard REST endpoint to create/add a portfolio holding
 */
export const createHolding = async (req, res) => {
    try {
        const { symbol, stockSymbol, stockName, quantity, buyPrice, purchaseDate, notes, exchange, token } = req.body;
        const userId = req.user.userId;

        const targetSymbol = (symbol || stockSymbol || '').trim().toUpperCase();
        if (!targetSymbol || !stockName || !quantity || !buyPrice) {
            return res.status(400).json({
                success: false,
                message: 'symbol, stockName, quantity, and buyPrice are required.'
            });
        }

        const { token: resolvedToken, exchange: resolvedExchange } = await resolveTokenAndExchange(targetSymbol, exchange, token);

        const holding = new PortfolioHolding({
            userId,
            stockSymbol: targetSymbol,
            symbol: targetSymbol,
            stockName: stockName.trim(),
            quantity: Number(quantity),
            buyPrice: Number(buyPrice),
            purchaseDate: purchaseDate || Date.now(),
            token: resolvedToken,
            exchange: resolvedExchange,
            notes
        });

        await holding.save();

        res.status(201).json({
            success: true,
            message: 'Portfolio holding created successfully',
            data: holding
        });
    } catch (error) {
        console.error('Error in createHolding:', error);
        const isDev = process.env.NODE_ENV === 'development';
        res.status(500).json({
            success: false,
            message: isDev ? error.message : 'Error creating portfolio holding'
        });
    }
};

/**
 * PATCH /api/portfolio/:id
 * Standard REST endpoint to update a portfolio holding by document ID
 */
export const updateHolding = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, buyPrice, purchaseDate, notes, exchange, token } = req.body;
        const userId = req.user.userId;

        const holding = await PortfolioHolding.findById(id);
        if (!holding) {
            return res.status(404).json({ success: false, message: 'Portfolio holding not found' });
        }

        if (holding.userId.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized to modify this holding' });
        }

        if (quantity !== undefined) holding.quantity = Number(quantity);
        if (buyPrice !== undefined) holding.buyPrice = Number(buyPrice);
        if (purchaseDate !== undefined) holding.purchaseDate = purchaseDate;
        if (notes !== undefined) holding.notes = notes;
        if (exchange !== undefined) holding.exchange = exchange;
        if (token !== undefined) holding.token = token;
        
        holding.updatedAt = Date.now();
        await holding.save();

        res.status(200).json({
            success: true,
            message: 'Portfolio holding updated successfully',
            data: holding
        });
    } catch (error) {
        console.error('Error in updateHolding:', error);
        const isDev = process.env.NODE_ENV === 'development';
        res.status(500).json({
            success: false,
            message: isDev ? error.message : 'Error updating portfolio holding'
        });
    }
};

/**
 * DELETE /api/portfolio/:id
 * Standard REST endpoint to delete a portfolio holding by document ID
 */
export const deleteHoldingById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        const holding = await PortfolioHolding.findById(id);
        if (!holding) {
            return res.status(404).json({ success: false, message: 'Portfolio holding not found' });
        }

        if (holding.userId.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this holding' });
        }

        await PortfolioHolding.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Portfolio holding deleted successfully'
        });
    } catch (error) {
        console.error('Error in deleteHoldingById:', error);
        const isDev = process.env.NODE_ENV === 'development';
        res.status(500).json({
            success: false,
            message: isDev ? error.message : 'Error deleting portfolio holding'
        });
    }
};

/**
 * GET /api/portfolio
 * Retrieve all holdings for the user, enriched with live stock prices using batch quotes
 */
export const getHoldings = async (req, res) => {
    try {
        const userId = req.user.userId;
        const holdings = await PortfolioHolding.find({ userId });
        const symbols = holdings.map(h => h.stockSymbol);

        // Fetch quotes in one single batch! Very efficient and avoids rate limit errors.
        const quotes = await angleOneService.getQuotes(symbols);

        const enrichedHoldings = holdings.map((holding) => {
            const quote = quotes[holding.stockSymbol];
            const currentPrice = quote ? quote.currentPrice : holding.buyPrice;
            const investedAmount = Number((holding.quantity * holding.buyPrice).toFixed(2));
            const currentValue = Number((holding.quantity * currentPrice).toFixed(2));
            const profitLoss = Number((currentValue - investedAmount).toFixed(2));
            const profitPercentage = investedAmount > 0 ? Number(((profitLoss / investedAmount) * 100).toFixed(2)) : 0;

            return {
                _id: holding._id,
                stockSymbol: holding.stockSymbol,
                symbol: holding.symbol || holding.stockSymbol,
                stockName: holding.stockName,
                quantity: holding.quantity,
                buyPrice: holding.buyPrice,
                purchaseDate: holding.purchaseDate,
                notes: holding.notes,
                token: holding.token || (angleOneService.TOKEN_MAPPING[holding.stockSymbol]?.token),
                exchange: holding.exchange,
                currentPrice,
                investedAmount,
                currentValue,
                profitLoss,
                profitPercentage,
                change: quote ? quote.change : 0,
                changePercent: quote ? quote.changePercent : 0
            };
        });

        // Compute total portfolio metrics
        let totalInvested = 0;
        let totalCurrentValue = 0;

        enrichedHoldings.forEach(item => {
            totalInvested += item.investedAmount;
            totalCurrentValue += item.currentValue;
        });

        const totalProfitLoss = Number((totalCurrentValue - totalInvested).toFixed(2));
        const totalProfitPercent = totalInvested > 0 ? Number(((totalProfitLoss / totalInvested) * 100).toFixed(2)) : 0;

        res.status(200).json({
            success: true,
            summary: {
                totalInvested,
                totalCurrentValue,
                totalProfitLoss,
                totalProfitPercent
            },
            holdings: enrichedHoldings
        });
    } catch (error) {
        console.error('Error in getHoldings:', error);
        const isDev = process.env.NODE_ENV === 'development';
        res.status(500).json({
            success: false,
            message: isDev ? error.message : 'Error fetching portfolio holdings'
        });
    }
};
