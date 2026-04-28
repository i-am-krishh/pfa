import FamilyGoalPlan from '../models/FamilyGoalPlan.js';
import Income from '../models/Income.js';
import Expense from '../models/Expense.js';
import Loan from '../models/Loan.js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import mongoose from 'mongoose';

export const analyzeGoal = async (req, res) => {
    try {
        const { familyId, goalType, goalName, targetAmount, currentSavedAmount, deadlineMonths, priority } = req.body;
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

        // 2. Financial Calculations
        const monthlySurplus = totalMonthlyIncome - totalMonthlyExpenses;
        const remainingToSave = targetAmount - currentSavedAmount;
        const monthlyRequiredSaving = remainingToSave / deadlineMonths;
        const monthlyShortfall = Math.max(0, monthlyRequiredSaving - monthlySurplus);
        const savingsRate = totalMonthlyIncome > 0 ? (monthlySurplus / totalMonthlyIncome) * 100 : 0;
        const emiToIncomeRatio = totalMonthlyIncome > 0 ? (totalMonthlyEMI / totalMonthlyIncome) * 100 : 0;

        // 3. Feasibility Score logic
        let feasibilityScore = 70; // Base score
        if (monthlySurplus >= monthlyRequiredSaving) feasibilityScore += 20;
        else feasibilityScore -= 20;

        if (emiToIncomeRatio > 40) feasibilityScore -= 15;
        if (savingsRate < 20) feasibilityScore -= 10;
        if (savingsRate > 40) feasibilityScore += 10;
        
        feasibilityScore = Math.max(0, Math.min(100, feasibilityScore));

        let status = 'achievable';
        if (feasibilityScore < 40) status = 'unlikely';
        else if (feasibilityScore < 70) status = 'difficult';

        // 4. Gemini AI Guidance
        const API_KEY = process.env.GEMINI_API_KEY;
        let aiResult = { 
            summary: `Financial Analysis: Your family currently generates a monthly income of ₹${totalMonthlyIncome.toLocaleString()} with expenses totaling ₹${totalMonthlyExpenses.toLocaleString()}, leaving a surplus of ₹${monthlySurplus.toLocaleString()}. To achieve the "${goalName}" goal within ${deadlineMonths} months, you need to save ₹${monthlyRequiredSaving.toLocaleString()} monthly. Currently, your ${monthlyShortfall > 0 ? `shortfall is ₹${monthlyShortfall.toLocaleString()} per month` : 'surplus covers the requirement'}. With an EMI-to-income ratio of ${emiToIncomeRatio.toFixed(1)}% and a savings rate of ${savingsRate.toFixed(1)}%, this goal is considered ${status.toUpperCase()}.`,
            isAchievable: status === 'achievable' ? "true" : "false",
            monthlyPlan: `Aim to save at least ₹${monthlyRequiredSaving.toLocaleString()} per month.`,
            expenseReduction: "Review your discretionary spending to close the gap.",
            riskWarnings: "General market inflation and unexpected expenses.",
            investmentGuidance: "Consider safe high-yield savings accounts or liquid funds.",
            alternativeTimeline: status === 'difficult' ? "Consider extending the deadline to reduce monthly pressure." : null,
            roadmap: [
                { step: 1, title: "Initial Buffer", description: "Set aside the first month's required saving.", targetDate: new Date() }
            ],
            fullResponse: "Rule-based fallback summary."
        };

        if (API_KEY && API_KEY !== 'your_gemini_api_key') {
            try {
                const genAI = new GoogleGenerativeAI(API_KEY);
                const modelsToTry = ["gemini-1.5-flash", "gemini-pro", "gemini-1.0-pro"];
                let success = false;

                for (const modelName of modelsToTry) {
                    try {
                        const model = genAI.getGenerativeModel({ model: modelName });
                        const prompt = `
                            You are an expert family financial advisor. Analyze the following family financial goal:
                            
                            Goal: ${goalName} (${goalType})
                            Target Amount: ₹${targetAmount}
                            Current Saved: ₹${currentSavedAmount}
                            Deadline: ${deadlineMonths} months
                            Priority: ${priority}
                            
                            Family Financial Metrics:
                            - Monthly Income: ₹${totalMonthlyIncome}
                            - Monthly Expenses: ₹${totalMonthlyExpenses}
                            - Monthly Surplus: ₹${monthlySurplus}
                            - Total Monthly EMI: ₹${totalMonthlyEMI}
                            - Savings Rate: ${savingsRate.toFixed(2)}%
                            - EMI-to-Income Ratio: ${emiToIncomeRatio.toFixed(2)}%
                            - Required Monthly Saving: ₹${monthlyRequiredSaving.toFixed(2)}
                            - Monthly Shortfall: ₹${monthlyShortfall.toFixed(2)}
                            - Feasibility Score: ${feasibilityScore}/100
                            
                            Instructions:
                            Provide a detailed analysis in JSON format with the following keys:
                            - summary: A detailed and insightful executive summary explaining the current financial health of the family in relation to this goal, including strengths and major obstacles.
                            - isAchievable: A boolean string ("true"/"false") and why.
                            - monthlyPlan: A specific monthly saving and investment strategy.
                            - expenseReduction: 3-4 specific areas to cut costs.
                            - riskWarnings: Potential financial risks.
                            - investmentGuidance: Suggestions on where to keep/invest the savings.
                            - alternativeTimeline: If the goal is difficult, suggest a realistic timeline.
                            - roadmap: A list of 4-5 steps (title and description) to achieve this goal.
                            
                            IMPORTANT: The response MUST be valid JSON. Do not include any text before or after the JSON.
                        `;

                        const result = await model.generateContent(prompt);
                        const response = await result.response;
                        let text = response.text().trim();
                        
                        // Clean markdown formatting if present
                        if (text.includes('```')) {
                            text = text.replace(/```json|```/g, '').trim();
                        }
                        
                        const jsonResult = JSON.parse(text);

                        aiResult = {
                            summary: jsonResult.summary,
                            isAchievable: jsonResult.isAchievable,
                            monthlyPlan: jsonResult.monthlyPlan,
                            expenseReduction: jsonResult.expenseReduction,
                            riskWarnings: jsonResult.riskWarnings,
                            investmentGuidance: jsonResult.investmentGuidance,
                            alternativeTimeline: jsonResult.alternativeTimeline,
                            roadmap: jsonResult.roadmap?.map((step, index) => ({
                                step: index + 1,
                                title: step.title,
                                description: step.description,
                                targetDate: new Date(Date.now() + (deadlineMonths / 4) * (index + 1) * 30 * 24 * 60 * 60 * 1000)
                            })),
                            fullResponse: text
                        };
                        success = true;
                        break;
                    } catch (modelError) {
                        console.error(`Model ${modelName} failed in Goal Planner:`, modelError.message);
                    }
                }
            } catch (aiError) {
                console.error("Gemini API Error in Goal Planner:", aiError);
            }
        } else {
            console.warn("GEMINI_API_KEY is missing or invalid in Goal Planner.");
        }

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
