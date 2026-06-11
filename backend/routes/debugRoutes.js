import express from 'express';
import { runFamilyGoalPlannerGemini } from '../controllers/familyGoalPlannerController.js';
import { runChatbotGemini } from '../controllers/chatbotController.js';
import { runStockAnalyzerGemini } from '../controllers/marketAIController.js';
import { runTaxAdvisorGemini } from '../controllers/taxSavingController.js';
import { runBudgetAdvisorGemini } from '../controllers/advisorController.js';

const router = express.Router();

router.get('/gemini/:module', async (req, res) => {
    const rawModule = req.params.module;
    const lowerModule = rawModule.toLowerCase().trim();

    // Map module names
    const moduleMap = {
        'family-goal-planner': 'family-goal-planner',
        'familygoalplanner': 'family-goal-planner',
        'goal-planner': 'family-goal-planner',
        'family-goal': 'family-goal-planner',
        '1': 'family-goal-planner',
        
        'financial-advisor-chatbot': 'chatbot',
        'chatbot': 'chatbot',
        'financial-advisor': 'chatbot',
        'chat': 'chatbot',
        '2': 'chatbot',
        
        'stock-analyzer': 'stock-analyzer',
        'stock': 'stock-analyzer',
        'market-ai': 'stock-analyzer',
        '3': 'stock-analyzer',
        
        'tax-recommendation-engine': 'tax-recommendation-engine',
        'tax-saving': 'tax-recommendation-engine',
        'tax': 'tax-recommendation-engine',
        '4': 'tax-recommendation-engine',
        
        'budget-recommendation-engine': 'budget-recommendation-engine',
        'budget-advisor': 'budget-recommendation-engine',
        'advisor': 'budget-recommendation-engine',
        'budget': 'budget-recommendation-engine',
        '5': 'budget-recommendation-engine'
    };

    const mappedModule = moduleMap[lowerModule];

    if (!mappedModule) {
        return res.status(400).json({
            success: false,
            message: `Unknown module: '${rawModule}'. Valid modules: family-goal-planner (1), chatbot (2), stock-analyzer (3), tax-recommendation-engine (4), budget-recommendation-engine (5)`
        });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const apiKeyPresent = !!apiKey && apiKey.trim() !== '';
    const geminiConfigured = apiKeyPresent && !apiKey.includes('your_gemini') && apiKey !== '';

    let requestPayload = null;
    let geminiResult = null;
    let errors = [];

    try {
        if (mappedModule === 'family-goal-planner') {
            requestPayload = {
                goalName: "Buy a Family Electric Car",
                goalType: "vehicle",
                targetAmount: 1500000,
                futureTargetAmount: 1680000,
                currentSavedAmount: 300000,
                fvSaved: 340000,
                deadlineMonths: 24,
                priority: "medium",
                riskProfile: "medium",
                suggestedStrategy: "Balanced: Route 55% to Diversified Multi-Cap Equity Funds, 30% to Dynamic Bond Mutual Funds, 10% to Gold ETFs, and 5% to Liquid Cash equivalents.",
                totalMonthlyIncome: 150000,
                totalMonthlyExpenses: 80000,
                monthlySurplus: 70000,
                totalMonthlyEMI: 15000,
                savingsRate: 46.67,
                requiredMonthlyInvestment: 51000,
                monthlyShortfall: 0,
                achievementProbability: 95,
                feasibilityScore: 95
            };
            geminiResult = await runFamilyGoalPlannerGemini(requestPayload);
        } else if (mappedModule === 'chatbot') {
            requestPayload = {
                name: "Test User",
                totalIncome: 150000,
                totalExpense: 80000,
                netSavings: 70000,
                savingsRate: 46,
                totalSavings: 300000,
                totalInvestment: 500000,
                totalLoan: 200000,
                monthlyEMI: 15000,
                topCategories: [
                    { category: "Housing", amount: 30000 },
                    { category: "Food", amount: 20000 },
                    { category: "Utilities", amount: 10000 }
                ],
                recentExpenses: [
                    "₹15,000 for Rent on 2026-06-01",
                    "₹5,000 for Groceries on 2026-06-05",
                    "₹2,500 for Dining Out on 2026-06-08"
                ],
                message: "Can you review my financial health?"
            };
            geminiResult = await runChatbotGemini(requestPayload);
        } else if (mappedModule === 'stock-analyzer') {
            requestPayload = {
                symbol: "RELIANCE",
                quote: {
                    currentPrice: 2450.50,
                    dayHigh: 2480.00,
                    dayLow: 2430.00,
                    volume: 5000000,
                    change: 20.50,
                    changePercent: 0.84
                },
                technicals: {
                    rsi: 58.5,
                    sma: 2420.00
                },
                riskProfile: "medium",
                userPortfolio: [
                    { stockSymbol: "RELIANCE", quantity: 10, buyPrice: 2300.00 }
                ],
                familyGoals: [
                    { goalName: "Child Education Fund", targetAmount: 2000000 }
                ]
            };
            geminiResult = await runStockAnalyzerGemini(requestPayload);
        } else if (mappedModule === 'tax-recommendation-engine') {
            requestPayload = {};
            geminiResult = await runTaxAdvisorGemini(requestPayload);
        } else if (mappedModule === 'budget-recommendation-engine') {
            requestPayload = {
                uIncome: 100000,
                uExpenses: 60000,
                fIncome: 150000,
                fExpenses: 80000,
                combinedSavings: 110000,
                riskProfile: "medium",
                riskScore: 65,
                financialGoals: "Retirement planning in 15 years",
                tAmount: 10000000,
                horizon: 15,
                goalFeasibility: "High",
                calculatedMessage: "At an estimated 9% annual return, your savings capacity is fully sufficient.",
                consolidatedPortfolio: [
                    { type: "stock", symbol: "RELIANCE", name: "Reliance Industries", quantity: 10, buyPrice: 2300.00, value: 24500 },
                    { type: "mutual_fund", name: "HDFC Top 100 Fund", amount: 100000, currentValue: 120000 }
                ],
                totalPortfolioValue: 144500,
                totalInvestedAmount: 123000,
                familyGoalsSummary: [
                    { name: "Child Higher Education", targetAmount: 3000000, currentAmount: 500000, deadline: "2035-01-01", status: "In Progress" }
                ],
                indexSummary: [
                    { name: "Nifty 50", value: 22000, changePercent: 0.5 }
                ]
            };
            geminiResult = await runBudgetAdvisorGemini(requestPayload);
        }
    } catch (err) {
        errors.push(`Execution error: ${err.message}`);
    }

    if (geminiResult) {
        if (!geminiResult.success && geminiResult.error) {
            errors.push(geminiResult.error);
        }
        res.status(geminiResult.success ? 200 : 503).json({
            module: mappedModule,
            geminiConfigured: mappedModule === 'tax-recommendation-engine' ? false : geminiConfigured,
            apiKeyPresent,
            requestPayload,
            prompt: geminiResult.prompt,
            rawGeminiResponse: geminiResult.rawResponse,
            transformedResponse: geminiResult.transformedResponse,
            fallbackUsed: false,
            errors
        });
    } else {
        res.status(500).json({
            module: mappedModule,
            geminiConfigured: mappedModule === 'tax-recommendation-engine' ? false : geminiConfigured,
            apiKeyPresent,
            requestPayload,
            prompt: null,
            rawGeminiResponse: null,
            transformedResponse: null,
            fallbackUsed: false,
            errors
        });
    }
});

export default router;
