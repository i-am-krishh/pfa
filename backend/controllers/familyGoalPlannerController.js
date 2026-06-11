import FamilyGoalPlan from '../models/FamilyGoalPlan.js';
import Income from '../models/Income.js';
import Expense from '../models/Expense.js';
import Loan from '../models/Loan.js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import mongoose from 'mongoose';

export const analyzeGoal = async (req, res) => {
    try {
        const { familyId, goalType, goalName, targetAmount, currentSavedAmount, deadlineMonths, priority, riskProfile = 'medium' } = req.body;
        const family = req.family;

        if (!goalType || !goalName || !targetAmount || !deadlineMonths) {
            return res.status(400).json({ success: false, message: "Required fields missing" });
        }

        // 1. Aggregate Family Finances
        const memberIds = family.members.filter(m => m.status === 'Approved').map(m => m.user);
        memberIds.push(family.admin);

        const incomeData = await Income.aggregate([
            {
                $match: {
                    $or: [
                        { familyGroupId: family._id },
                        {
                            userId: { $in: memberIds },
                            'familySync.enabled': true,
                            'familySync.familyId': family._id
                        }
                    ]
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const expenseData = await Expense.aggregate([
            {
                $match: {
                    $or: [
                        { familyGroupId: family._id },
                        {
                            userId: { $in: memberIds },
                            'familySync.enabled': true,
                            'familySync.familyId': family._id
                        }
                    ]
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const loanData = await Loan.aggregate([
            {
                $match: {
                    $or: [
                        { familyGroupId: family._id },
                        {
                            userId: { $in: memberIds },
                            'familySync.enabled': true,
                            'familySync.familyId': family._id
                        }
                    ]
                }
            },
            { $group: { _id: null, totalEMI: { $sum: '$monthlyEMI' } } }
        ]);

        const totalMonthlyIncome = (incomeData[0]?.total || 0);
        const totalMonthlyExpenses = (expenseData[0]?.total || 0);
        const totalMonthlyEMI = (loanData[0]?.totalEMI || 0);

        // 2. Financial Calculations with Investment Integration
        const monthlySurplus = totalMonthlyIncome - totalMonthlyExpenses;
        const savingsRate = totalMonthlyIncome > 0 ? (monthlySurplus / totalMonthlyIncome) * 100 : 0;
        const emiToIncomeRatio = totalMonthlyIncome > 0 ? (totalMonthlyEMI / totalMonthlyIncome) * 100 : 0;

        // Inflation Adjustment (assume 6% annual inflation)
        const inflationRate = 0.06;
        const years = deadlineMonths / 12;
        const futureTargetAmount = Math.round(targetAmount * Math.pow(1 + inflationRate, years));

        // Returns based on risk profile
        let expectedReturn = 0.09; // Medium: 9%
        if (riskProfile.toLowerCase() === 'low') expectedReturn = 0.06; // Low: 6%
        if (riskProfile.toLowerCase() === 'high') expectedReturn = 0.12; // High: 12%

        // Compound growth on existing savings over timeline
        const monthlyRate = expectedReturn / 12;
        const fvSaved = Math.round(currentSavedAmount * Math.pow(1 + monthlyRate, deadlineMonths));

        // Required Monthly Investment (SIP growth calculations)
        const remainingTarget = Math.max(0, futureTargetAmount - fvSaved);
        const sipFactor = ((Math.pow(1 + monthlyRate, deadlineMonths) - 1) / monthlyRate) * (1 + monthlyRate);
        const requiredMonthlyInvestment = remainingTarget > 0 ? Math.round(remainingTarget / sipFactor) : 0;
        const monthlyRequiredSaving = requiredMonthlyInvestment; // compatibility mapping

        // Projected Future Value if investing the current surplus + existing saved
        const fvSurplusSIP = Math.round(monthlySurplus * sipFactor);
        const projectedFutureValue = fvSaved + fvSurplusSIP;

        // Monthly Shortfall
        const monthlyShortfall = Math.max(0, requiredMonthlyInvestment - monthlySurplus);

        // Goal Achievement Probability based on savings capacity safety margin
        let achievementProbability = 100;
        if (requiredMonthlyInvestment > 0) {
            const ratio = monthlySurplus / requiredMonthlyInvestment;
            if (ratio >= 1.5) {
                achievementProbability = Math.min(99, 95 + Math.round((ratio - 1.5) * 2));
            } else if (ratio >= 1.0) {
                achievementProbability = 80 + Math.round((ratio - 1.0) * 30);
            } else if (ratio >= 0.5) {
                achievementProbability = 40 + Math.round((ratio - 0.5) * 80);
            } else {
                achievementProbability = Math.max(5, Math.round(ratio * 80));
            }
        }

        // Suggested investment strategy text
        let suggestedStrategy = '';
        if (riskProfile.toLowerCase() === 'low') {
            suggestedStrategy = "Conservative: Route 25% to Nifty 50 Index Mutual Funds, 65% to AAA Debt Corporate Bond Funds & Liquid Deposits, and 10% to Gold Sovereign Bonds.";
        } else if (riskProfile.toLowerCase() === 'high') {
            suggestedStrategy = "Aggressive: Route 40% to Large Cap Index ETFs, 35% to Mid & Small Cap Mutual Funds, 15% to Alternative Assets (e.g. Crypto/Sectoral), and 10% to short-term Bond Funds.";
        } else {
            suggestedStrategy = "Balanced: Route 55% to Diversified Multi-Cap Equity Funds, 30% to Dynamic Bond Mutual Funds, 10% to Gold ETFs, and 5% to Liquid Cash equivalents.";
        }

        // 3. Feasibility Score mapping
        const feasibilityScore = achievementProbability;

        let status = 'achievable';
        if (feasibilityScore < 40) status = 'unlikely';
        else if (feasibilityScore < 70) status = 'difficult';

        // 4. Gemini AI Guidance call
        const geminiResult = await runFamilyGoalPlannerGemini({
            goalName,
            goalType,
            targetAmount,
            futureTargetAmount,
            currentSavedAmount,
            fvSaved,
            deadlineMonths,
            priority,
            riskProfile,
            suggestedStrategy,
            totalMonthlyIncome,
            totalMonthlyExpenses,
            monthlySurplus,
            totalMonthlyEMI,
            savingsRate,
            requiredMonthlyInvestment,
            monthlyShortfall,
            achievementProbability,
            feasibilityScore
        });

        if (!geminiResult.success) {
            return res.status(503).json({ error: "Gemini API unavailable" });
        }

        const aiResult = geminiResult.transformedResponse;

        // 5. Save to Database
        const goalPlan = new FamilyGoalPlan({
            familyId,
            createdBy: req.user.userId,
            goalType,
            goalName,
            targetAmount,
            currentSavedAmount,
            deadlineMonths,
            priority,
            riskProfile,
            inflationRate,
            futureTargetAmount,
            projectedFutureValue,
            achievementProbability,
            suggestedStrategy,
            monthlyRequiredSaving,
            monthlyCurrentSurplus: monthlySurplus,
            monthlyShortfall,
            savingsRate,
            emiToIncomeRatio,
            feasibilityScore,
            status,
            aiSuggestion: aiResult,
            roadmap: aiResult.roadmap || []
        });

        await goalPlan.save();

        res.status(201).json({
            success: true,
            message: "Goal analysis completed",
            data: goalPlan
        });

    } catch (error) {
        console.error("Goal Planner Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getFamilyGoalPlans = async (req, res) => {
    try {
        const { familyId } = req.params;
        const plans = await FamilyGoalPlan.find({ familyId }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: plans });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getGoalPlanDetail = async (req, res) => {
    try {
        const { planId } = req.params;
        const plan = await FamilyGoalPlan.findById(planId);
        if (!plan) return res.status(404).json({ success: false, message: "Goal plan not found" });
        res.status(200).json({ success: true, data: plan });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const runFamilyGoalPlannerGemini = async (data) => {
    const API_KEY = process.env.GEMINI_API_KEY;
    const isApiKeyMissing = !API_KEY || API_KEY.includes('your_gemini') || API_KEY === '';

    const prompt = `
        You are an expert family financial advisor. Analyze the following family financial goal and provide investment suggestions:
        
        Goal: ${data.goalName} (${data.goalType})
        Current Value Target Amount: ₹${data.targetAmount}
        Inflation-Adjusted Target Amount (6% inflation): ₹${data.futureTargetAmount}
        Current Saved: ₹${data.currentSavedAmount} (Projected to grow to ₹${data.fvSaved} in ${data.deadlineMonths} months)
        Deadline: ${data.deadlineMonths} months
        Priority: ${data.priority}
        Risk Profile Selected: ${data.riskProfile}
        Suggested Allocation Strategy: ${data.suggestedStrategy}
        
        Family Financial Metrics:
        - Monthly Income: ₹${data.totalMonthlyIncome}
        - Monthly Expenses: ₹${data.totalMonthlyExpenses}
        - Net Monthly Surplus: ₹${data.monthlySurplus}
        - Total Monthly EMI: ₹${data.totalMonthlyEMI}
        - Savings Rate: ${data.savingsRate.toFixed(2)}%
        - Required Monthly SIP: ₹${data.requiredMonthlyInvestment}
        - Monthly Shortfall: ₹${data.monthlyShortfall}
        - Goal Achievement Probability: ${data.achievementProbability}%
        - Feasibility Score: ${data.feasibilityScore}/100
        
        Instructions:
        Provide a detailed analysis in JSON format with the following keys:
        - summary: A detailed and insightful executive summary explaining the financial health of the family in relation to this goal, inflation-adjusted target, and probabilities.
        - isAchievable: A boolean string ("true"/"false") and why.
        - monthlyPlan: A specific monthly saving and investment strategy referencing the suggested allocation: ${data.suggestedStrategy} and required SIP.
        - expenseReduction: 3-4 specific areas to cut costs.
        - riskWarnings: Potential financial risks and market volatility matching the ${data.riskProfile} risk profile.
        - investmentGuidance: Suggestions on where to keep/invest the savings matching the strategy: ${data.suggestedStrategy}.
        - alternativeTimeline: Suggest a realistic timeline or changes if goal is difficult.
        - roadmap: A list of 4-5 steps (title and description) to achieve this goal.
        
        IMPORTANT: The response MUST be valid JSON. Do not include any text before or after the JSON.
    `;

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
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text().trim();
            
            // Clean markdown formatting if present
            let cleanedText = text;
            if (cleanedText.includes('```')) {
                cleanedText = cleanedText.replace(/```json|```/g, '').trim();
            }

            const ensureStringArray = (val) => {
                if (val === undefined || val === null) return [];
                if (Array.isArray(val)) {
                    return val.map(item => String(item).trim()).filter(Boolean);
                }
                return [String(val).trim()].filter(Boolean);
            };

            const jsonResult = JSON.parse(cleanedText);
            const transformedResponse = {
                summary: jsonResult.summary,
                isAchievable: jsonResult.isAchievable,
                monthlyPlan: jsonResult.monthlyPlan,
                expenseReduction: ensureStringArray(jsonResult.expenseReduction),
                riskWarnings: ensureStringArray(jsonResult.riskWarnings),
                recommendations: ensureStringArray(jsonResult.recommendations),
                actionPlan: ensureStringArray(jsonResult.actionPlan),
                investmentGuidance: jsonResult.investmentGuidance,
                alternativeTimeline: jsonResult.alternativeTimeline,
                fullResponse: text,
                roadmap: jsonResult.roadmap?.map((step, index) => ({
                    step: index + 1,
                    title: step.title,
                    description: step.description,
                    targetDate: new Date(Date.now() + (data.deadlineMonths / 4) * (index + 1) * 30 * 24 * 60 * 60 * 1000)
                }))
            };

            return {
                success: true,
                prompt,
                rawResponse: text,
                transformedResponse,
                error: null
            };
        } catch (modelError) {
            console.error(`Model ${modelName} failed in Goal Planner:`, modelError.message);
            lastError = modelError.message;
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
