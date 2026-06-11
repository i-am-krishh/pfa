import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import PortfolioHolding from '../models/PortfolioHolding.js';
import Investment from '../models/Investment.js';
import FamilyGroup from '../models/FamilyGroup.js';
import * as angleOneService from '../services/yahooFinanceService.js';
dotenv.config();

export const getInvestmentAdvice = async (req, res) => {
    try {
        const userId = req.user.userId;
        const {
            userIncome,
            userExpenses,
            familyIncome,
            familyExpenses,
            riskProfile,
            financialGoals,
            investmentHorizon,
            targetAmount
        } = req.body;

        // 1. Inputs validation
        if (
            userIncome === undefined || 
            userExpenses === undefined || 
            !riskProfile || 
            typeof riskProfile !== 'string' ||
            !['low', 'medium', 'high'].includes(riskProfile.toLowerCase()) ||
            !financialGoals || 
            typeof financialGoals !== 'string' ||
            investmentHorizon === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid inputs. userIncome (number), userExpenses (number), riskProfile ("low" | "medium" | "high"), financialGoals (string), and investmentHorizon (number) are required.'
            });
        }

        // Convert types to numbers
        const uIncome = Number(userIncome) || 0;
        const uExpenses = Number(userExpenses) || 0;
        const fIncome = Number(familyIncome) || 0;
        const fExpenses = Number(familyExpenses) || 0;
        const horizon = Number(investmentHorizon) || 1;
        const tAmount = targetAmount ? Number(targetAmount) : 0;

        // 2. Perform Backend Calculations
        // A. Savings Capacity
        const individualSavings = uIncome - uExpenses;
        const familySavings = fIncome - fExpenses;
        const combinedSavings = individualSavings + (fIncome > 0 ? familySavings : 0);

        // B. Risk Score [10-95]
        let riskScore = 50; // Medium base
        if (riskProfile.toLowerCase() === 'low') riskScore = 25;
        if (riskProfile.toLowerCase() === 'high') riskScore = 80;

        // Adjust based on investment horizon
        if (horizon < 3) {
            riskScore = Math.max(10, riskScore - 15); // de-risk for short term
        } else if (horizon > 7) {
            riskScore = Math.min(95, riskScore + 15); // long term allows higher risk tolerance
        }

        // C. Goal Feasibility using compound interest SIP formula
        // FV SIP Formula: FV = P * [((1 + i)^n - 1) / i] * (1 + i)
        // Expected average return based on risk profile: Low = 6%, Medium = 9%, High = 12%
        let expectedReturn = 0.09;
        if (riskProfile.toLowerCase() === 'low') expectedReturn = 0.06;
        if (riskProfile.toLowerCase() === 'high') expectedReturn = 0.12;

        let requiredSIP = 0;
        let goalFeasibility = 'N/A';
        let calculatedMessage = '';

        if (tAmount > 0) {
            const monthlyRate = expectedReturn / 12;
            const months = horizon * 12;
            const sipFactor = ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
            requiredSIP = Number((tAmount / sipFactor).toFixed(2));

            const safetyMargin = combinedSavings / requiredSIP;
            if (safetyMargin >= 1.1) {
                goalFeasibility = 'High';
                calculatedMessage = `At an estimated ${expectedReturn * 100}% annual return, your current monthly savings capacity of ₹${combinedSavings.toLocaleString('en-IN')} is fully sufficient to meet the required monthly investment of ₹${requiredSIP.toLocaleString('en-IN')}.`;
            } else if (safetyMargin >= 0.7) {
                goalFeasibility = 'Medium';
                calculatedMessage = `At an estimated ${expectedReturn * 100}% annual return, you require an investment of ₹${requiredSIP.toLocaleString('en-IN')}/month. Your current savings capacity of ₹${combinedSavings.toLocaleString('en-IN')}/month is close. Minor budget cuts or a slightly longer horizon will ensure success.`;
            } else {
                goalFeasibility = 'Low';
                calculatedMessage = `You require an investment of ₹${requiredSIP.toLocaleString('en-IN')}/month to reach ₹${tAmount.toLocaleString('en-IN')} in ${horizon} years. Your current savings capacity is ₹${combinedSavings.toLocaleString('en-IN')}/month. Consider extending the horizon, reducing the goal size, or increasing monthly savings.`;
            }
        } else {
            // General wealth creation feasibility based on savings rate
            const totalIncome = uIncome + fIncome;
            const savingsRate = totalIncome > 0 ? (combinedSavings / totalIncome) * 100 : 0;
            
            if (savingsRate >= 30) {
                goalFeasibility = 'High';
                calculatedMessage = `Saving ${savingsRate.toFixed(1)}% of your income is an excellent rate. Your feasibility for wealth creation is high.`;
            } else if (savingsRate >= 15) {
                goalFeasibility = 'Medium';
                calculatedMessage = `Saving ${savingsRate.toFixed(1)}% of your income is moderate. Try to automate savings to push this above 20%.`;
            } else {
                goalFeasibility = 'Low';
                calculatedMessage = `Saving ${savingsRate.toFixed(1)}% of your income leaves you vulnerable to emergencies. Focus on cutting expenses or increasing income.`;
            }
        }

        // Fetch User's actual portfolio holdings & generic investments
        const holdings = await PortfolioHolding.find({ userId });
        const investments = await Investment.find({ userId });

        const holdingSymbols = holdings.map(h => h.stockSymbol);
        const quotes = holdingSymbols.length > 0 ? await angleOneService.getQuotes(holdingSymbols) : {};
        
        const portfolioDetails = holdings.map(h => {
            const q = quotes[h.stockSymbol];
            const curPrice = q ? q.currentPrice : h.buyPrice;
            const value = h.quantity * curPrice;
            return {
                type: 'stock',
                symbol: h.stockSymbol,
                name: h.stockName,
                quantity: h.quantity,
                buyPrice: h.buyPrice,
                currentPrice: curPrice,
                value: Number(value.toFixed(2))
            };
        });

        const investmentDetails = investments.map(inv => ({
            type: inv.type,
            name: inv.name,
            amount: inv.amount,
            currentValue: inv.currentValue || inv.amount
        }));

        const consolidatedPortfolio = [...portfolioDetails, ...investmentDetails];
        const totalPortfolioValue = consolidatedPortfolio.reduce((sum, item) => sum + (item.value || item.currentValue || 0), 0);
        const totalInvestedAmount = consolidatedPortfolio.reduce((sum, item) => sum + (item.quantity ? (item.quantity * item.buyPrice) : (item.amount || 0)), 0);

        // Fetch User's Family Group Goals
        const familyGroup = await FamilyGroup.findOne({
            $or: [
                { admin: userId },
                { 'members.user': userId, 'members.status': 'Approved' }
            ]
        });
        const familyGoalsList = familyGroup ? familyGroup.goals : [];
        const familyGoalsSummary = familyGoalsList.map(g => ({
            name: g.goalName,
            targetAmount: g.targetAmount,
            currentAmount: g.currentAmount,
            deadline: g.deadline,
            status: g.status
        }));

        // Fetch Market Indices
        let marketIndices = [];
        try {
            marketIndices = await angleOneService.getMarketIndices();
        } catch (err) {
            console.warn('[AdvisorController] Could not fetch market indices for advisor:', err.message);
        }
        const indexSummary = marketIndices.map(idx => ({
            name: idx.name,
            value: idx.currentValue,
            changePercent: idx.percentageChange
        }));

        // 3. Prepare call to runBudgetAdvisorGemini
        const calculatedStats = {
            savingsCapacity: combinedSavings,
            individualSavingsCapacity: individualSavings,
            familySavingsCapacity: familySavings,
            riskScore,
            expectedReturnRate: expectedReturn,
            requiredSIP,
            goalFeasibility,
            feasibilityMessage: calculatedMessage
        };

        const geminiResult = await runBudgetAdvisorGemini({
            uIncome,
            uExpenses,
            fIncome,
            fExpenses,
            combinedSavings,
            riskProfile,
            riskScore,
            financialGoals,
            tAmount,
            horizon,
            goalFeasibility,
            calculatedMessage,
            consolidatedPortfolio,
            totalPortfolioValue,
            totalInvestedAmount,
            familyGoalsSummary,
            indexSummary
        });

        if (geminiResult.success) {
            return res.status(200).json({
                success: true,
                calculations: calculatedStats,
                advice: geminiResult.transformedResponse
            });
        } else {
            console.warn('[AdvisorController] Gemini advice generation failed. Returning error.');
            return res.status(503).json({
                error: "Gemini API unavailable"
            });
        }
    } catch (error) {
        console.error('Advisor Controller crash:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating investment advisor report. Please try again later.'
        });
    }
};

// Fallback Mock Advisor Generator
function generateMockAdvice(riskProfile, horizon, stats, goals, targetAmount) {
    const isLow = riskProfile.toLowerCase() === 'low';
    const isHigh = riskProfile.toLowerCase() === 'high';

    let allocation = [];
    let sipAllocations = [];
    let strategy = '';
    let riskAnalysis = '';
    let roadmap = [];
    const monthlySIP = Math.max(0, stats.savingsCapacity * 0.8); // invest 80% of savings capacity

    if (isLow) {
        allocation = [
            { assetClass: 'Equity (Index & Large-Cap)', percentage: 25, description: 'Broad market index trackers' },
            { assetClass: 'Debt (Bonds, Fixed Deposits, Debt Funds)', percentage: 60, description: 'AAA rated government and corporate bonds for safety' },
            { assetClass: 'Gold & Commodities', percentage: 10, description: 'Inflation hedge gold sovereign bonds' },
            { assetClass: 'Cash & Cash Equivalents', percentage: 5, description: 'Emergency liquid reserves' }
        ];

        sipAllocations = [
            { category: 'Nifty 50 Index Mutual Fund', amount: Math.floor(monthlySIP * 0.25), reason: 'Low-cost broad market exposure.' },
            { category: 'Liquid or Ultra-Short Term Debt Fund', amount: Math.floor(monthlySIP * 0.40), reason: 'Capital safety with easy liquidity.' },
            { category: 'Corporate Bond Fund', amount: Math.floor(monthlySIP * 0.25), reason: 'Regular returns with minimal default risk.' },
            { category: 'Gold ETF / Sovereign Gold Bonds', amount: Math.floor(monthlySIP * 0.10), reason: 'Long-term inflation protection.' }
        ];

        strategy = `A conservative wealth preservation strategy designed around your Low risk profile and ${horizon}-year investment timeline. Since you prioritize capital stability, 70% of the funds are routed to fixed income (debt and cash equivalents) to insulate you from equity volatility. 25% is allocated to large-cap equities to combat inflation over time, keeping your portfolio balanced.`;

        riskAnalysis = 'Your conservative portfolio contains low equity risk. The primary risk factor is inflation risk, where fixed income rates may struggle to outpace core inflation. This is mitigated by incorporating a 25% allocation to equity index funds and 10% in physical gold, allowing for long-term purchasing power maintenance.';

        roadmap = [
            { phase: 'Phase 1: Foundation (Months 1-3)', action: 'Establish an emergency fund in a liquid mutual fund containing at least 6 months of expenses.' },
            { phase: 'Phase 2: Systematic Allocation (Ongoing)', action: `Deploy the recommended ₹${monthlySIP.toLocaleString('en-IN')} monthly SIP into the designated debt, equity, and gold funds.` },
            { phase: 'Phase 3: Horizon Review (Annual)', action: 'Perform annual portfolio reviews. If equity values surge, rebalance back to the 25% equity target.' }
        ];
    } else if (isHigh) {
        allocation = [
            { assetClass: 'Equity (Large, Mid & Small-Cap)', percentage: 75, description: 'Growth-oriented equity mutual funds and index trackers' },
            { assetClass: 'Debt (Flexible Bond & Dynamic Funds)', percentage: 10, description: 'Minor debt cushioning for dynamic rebalancing' },
            { assetClass: 'Gold & Silver', percentage: 5, description: 'Asset hedge reserves' },
            { assetClass: 'Alternatives (Crypto, Tech-specifics)', percentage: 10, description: 'High-growth high-volatility direct assets' }
        ];

        sipAllocations = [
            { category: 'Nifty Index / Large Cap Fund', amount: Math.floor(monthlySIP * 0.40), reason: 'Core broad equity compounding.' },
            { category: 'Mid-Cap & Small-Cap Opportunity Fund', amount: Math.floor(monthlySIP * 0.35), reason: 'Aggressive growth to maximize wealth.' },
            { category: 'Alternative Assets (e.g. Bitcoin / Blue-Chip Tech)', amount: Math.floor(monthlySIP * 0.15), reason: 'High-risk alternative exposure.' },
            { category: 'Dynamic Bond or Short-Term Debt Fund', amount: Math.floor(monthlySIP * 0.10), reason: 'Dry powder for buying equity dips.' }
        ];

        strategy = `An aggressive, growth-oriented wealth maximization strategy suited to your High risk tolerance and long-term ${horizon}-year timeline. We allocate 75% of your savings into high-growth equity funds and 10% in alternative assets, enabling maximum compounding potential. Fixed income is kept to a minimum (10%) to serve as dry powder to purchase equities during major drawdowns.`;

        riskAnalysis = 'This portfolio is subject to high short-term equity market volatility and drawdown risks (up to 20-30% in market corrections). Since your timeline is long-term, these fluctuations are mitigated by time-diversification and systematic compounding (SIP). Avoid panic selling during dips.';

        roadmap = [
            { phase: 'Phase 1: Automated Deployment', action: `Set up automated SIPs totaling ₹${monthlySIP.toLocaleString('en-IN')}/month to automate dollar-cost averaging.` },
            { phase: 'Phase 2: Dip Opportunism', action: 'Use market corrections to deploy cash reserves or rebalance debt assets into equity at cheaper valuations.' },
            { phase: 'Phase 3: De-risking Phase', action: `When you are within 2 years of your target ${horizon}-year horizon, systematically shift 40% of equity gains into stable liquid debt funds to lock in returns.` }
        ];
    } else {
        // Medium risk
        allocation = [
            { assetClass: 'Equity (Index, Large-Cap, Flexi-Cap)', percentage: 55, description: 'Balanced growth through diversified equity holdings' },
            { assetClass: 'Debt (Bonds, Medium-Term Debt Mutual Funds)', percentage: 30, description: 'Stability and income generating assets' },
            { assetClass: 'Gold & Precious Metals', percentage: 10, description: 'Portfolio diversifier and inflation hedge' },
            { assetClass: 'Cash & Cash Equivalents', percentage: 5, description: 'Liquidity for emergencies or dip buying' }
        ];

        sipAllocations = [
            { category: 'Nifty 50 / Large Cap ETF', amount: Math.floor(monthlySIP * 0.35), reason: 'Core equity compounding.' },
            { category: 'Flexi-Cap / Active Equity Fund', amount: Math.floor(monthlySIP * 0.20), reason: 'Dynamic allocation across market caps.' },
            { category: 'Banking & PSU Debt Fund', amount: Math.floor(monthlySIP * 0.30), reason: 'Highly rated fixed income yield.' },
            { category: 'Gold Sovereign Bonds / ETFs', amount: Math.floor(monthlySIP * 0.15), reason: 'Systematic diversification.' }
        ];

        strategy = `A balanced growth strategy mapped to your Medium risk profile and ${horizon}-year investment timeline. It balances wealth compounding (55% equity) with capital insulation (30% debt). Gold and cash make up the remaining 15% to offer cushion and liquidity. This strategy aims to capture market upside while reducing downside shocks during volatility.`;

        riskAnalysis = 'Your portfolio holds moderate equity risk. Market corrections will impact valuations, but the fixed income (30%) and gold (10%) allocations act as volatility shock absorbers. Rebalancing semi-annually back to the 55/30 split will lock in profits during rallies and purchase cheap assets during dips.';

        roadmap = [
            { phase: 'Phase 1: Setup & Automation', action: `Initiate ₹${monthlySIP.toLocaleString('en-IN')} monthly mutual fund SIPs divided between Equity and Debt.` },
            { phase: 'Phase 2: Semi-Annual Rebalancing', action: 'Every 6 months, review the asset weights. If equity weight rises above 60%, sell the excess and buy debt/gold.' },
            { phase: 'Phase 3: Pre-Goal Shield', action: `As you approach the end of year ${Math.max(1, horizon - 1)}, systematically transfer equity values to liquid debt to safeguard capital for your final goal: "${goals}".` }
        ];
    }

    return {
        portfolioAllocation: allocation,
        investmentStrategy: strategy,
        sipRecommendation: {
            totalMonthlySIP: monthlySIP,
            recommendedAllocations: sipAllocations
        },
        riskAnalysis: riskAnalysis,
        goalRoadmap: roadmap,
        financialDisclaimer: 'DISCLAIMER: This report is generated dynamically by an AI financial advisor model for information and educational purposes only. Market investments are subject to capital risks. No returns are guaranteed or promised. Please perform detailed evaluation or consult a registered financial planner before making financial decisions.'
    };
}

export const runBudgetAdvisorGemini = async (data) => {
    const API_KEY = process.env.GEMINI_API_KEY;
    const isApiKeyMissing = !API_KEY || API_KEY.includes('your_gemini') || API_KEY === '';

    const prompt = `You are a certified professional financial planner and investment advisor. 
Generate a comprehensive, tailored investment advisory report in JSON format based on the following verified client data:

CLIENT DATA:
- Client Income: ₹${data.uIncome}/month
- Client Expenses: ₹${data.uExpenses}/month
- Family Income: ₹${data.fIncome}/month
- Family Expenses: ₹${data.fExpenses}/month
- Net Monthly Savings Capacity: ₹${data.combinedSavings}/month
- Risk Profile: ${data.riskProfile} (Calculated Risk Score: ${data.riskScore}/100)
- Financial Goal: "${data.financialGoals}" ${data.tAmount > 0 ? `with target valuation of ₹${data.tAmount}` : ''}
- Investment Horizon: ${data.horizon} years
- Goal Feasibility Assessment: ${data.goalFeasibility} (${data.calculatedMessage})

CLIENT'S REAL PORTFOLIO HOLDINGS & INVESTMENTS:
${data.consolidatedPortfolio && data.consolidatedPortfolio.length > 0 ? JSON.stringify(data.consolidatedPortfolio, null, 2) : 'No current investments.'}
- Total Portfolio Current Value: ₹${data.totalPortfolioValue ? data.totalPortfolioValue.toFixed(2) : '0.00'}
- Total Invested Amount: ₹${data.totalInvestedAmount ? data.totalInvestedAmount.toFixed(2) : '0.00'}

CLIENT'S FAMILY FINANCIAL GOALS:
${data.familyGoalsSummary && data.familyGoalsSummary.length > 0 ? JSON.stringify(data.familyGoalsSummary, null, 2) : 'No family goals set.'}

LIVE INDIAN STOCK MARKET INDICES:
${data.indexSummary && data.indexSummary.length > 0 ? JSON.stringify(data.indexSummary, null, 2) : 'Market index feed currently offline.'}

CRITICAL GUIDELINES:
1. Do not guarantee any specific returns. Use terms like "expected historical average" or "projected".
2. Always present details in a supportive, professional, and clear tone.
3. The response MUST be a valid JSON object matching the schema below.
4. Do NOT include any text before or after the JSON, and do NOT wrap it in markdown code blocks like \`\`\`json. Respond ONLY with the raw JSON string.
5. In your investment strategy and goal roadmap, reference the client's actual holdings, family goals, and live market indices to make the advice feel highly personalized and context-aware.

JSON RESPONSE SCHEMA:
{
  "portfolioAllocation": [
    { "assetClass": "Equity (e.g. Index, Large-cap, Mid-cap)", "percentage": number, "description": "string" },
    { "assetClass": "Debt (e.g. Fixed Income, Bonds, Debt Funds)", "percentage": number, "description": "string" },
    { "assetClass": "Gold/Commodities", "percentage": number, "description": "string" },
    { "assetClass": "Cash & Cash Equivalents", "percentage": number, "description": "string" }
  ],
  "investmentStrategy": "Detailed explanation of the customized asset allocation strategy and the reasons why it fits this user's risk score, timeline, and current holdings.",
  "sipRecommendation": {
    "totalMonthlySIP": number,
    "recommendedAllocations": [
      { "category": "Mutual Fund Class / Asset Type", "amount": number, "reason": "string" }
    ]
  },
  "riskAnalysis": "Summary of primary market risks (inflation risk, interest rate risk, equity volatility) and how this portfolio mitigates those risks.",
  "goalRoadmap": [
    { "phase": "string (e.g. Month 1, Year 1-2, Target Year)", "action": "string" }
  ],
  "financialDisclaimer": "string (mandatory disclaimer stating that investing is subject to market risks, no returns are guaranteed, and the client should perform due diligence or consult a registered advisor)"
}`;

    if (isApiKeyMissing) {
        return {
            success: false,
            prompt,
            rawResponse: null,
            transformedResponse: null,
            error: "Gemini API key is missing or set to placeholder."
        };
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const modelsToTry = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-pro"];
    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            console.log(`[AdvisorController] Attempting Gemini query using model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text().trim();
            
            let cleanedText = text;
            if (cleanedText.startsWith('```json')) {
                cleanedText = cleanedText.substring(7);
            }
            if (cleanedText.startsWith('```')) {
                cleanedText = cleanedText.substring(3);
            }
            if (cleanedText.endsWith('```')) {
                cleanedText = cleanedText.substring(0, cleanedText.length - 3);
            }
            cleanedText = cleanedText.trim();

            const parsedAdvice = JSON.parse(cleanedText);
            return {
                success: true,
                prompt,
                rawResponse: text,
                transformedResponse: parsedAdvice,
                error: null
            };
        } catch (err) {
            console.warn(`[AdvisorController] Model ${modelName} call failed:`, err.message);
            lastError = err.message;
        }
    }

    return {
        success: false,
        prompt,
        rawResponse: null,
        transformedResponse: null,
        error: lastError || "All Gemini models failed."
    };
};
