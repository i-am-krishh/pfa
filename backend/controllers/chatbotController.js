import { GoogleGenerativeAI } from "@google/generative-ai";
import User from '../models/User.js';
import Income from '../models/Income.js';
import Expense from '../models/Expense.js';
import Savings from '../models/Savings.js';
import Investment from '../models/Investment.js';
import Loan from '../models/Loan.js';
import FamilyGroup from '../models/FamilyGroup.js';
import FamilyWelfareProfile from '../models/FamilyWelfareProfile.js';
import dotenv from 'dotenv';

dotenv.config();

export const getChatbotResponse = async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.user.userId;

        if (!message) {
            return res.status(400).json({ success: false, message: "Message is required" });
        }

        // 1. Fetch User and Financial Records in Parallel
        const user = await User.findById(userId);
        const name = user ? user.fullName : "User";

        const [incomes, expenses, savings, investments, loans] = await Promise.all([
            Income.find({ userId }),
            Expense.find({ userId }),
            Savings.find({ userId }),
            Investment.find({ userId }),
            Loan.find({ userId })
        ]);

        // 2. Compute Financial Metrics
        const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
        const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
        const totalSavings = savings.reduce((sum, s) => sum + s.amount, 0); // uses 'amount' on schema
        const totalInvestment = investments.reduce((sum, inv) => sum + (inv.currentValue || inv.amount || 0), 0);
        const totalLoan = loans.reduce((sum, l) => sum + (l.remainingAmount || l.totalAmount || 0), 0);
        const monthlyEMI = loans.reduce((sum, l) => sum + (l.monthlyEMI || 0), 0);

        // Group expenses by category
        const categorySpending = {};
        expenses.forEach(e => {
            categorySpending[e.category] = (categorySpending[e.category] || 0) + e.amount;
        });

        // Sort categories by amount
        const topCategories = Object.keys(categorySpending)
            .map(cat => ({ category: cat, amount: categorySpending[cat] }))
            .sort((a, b) => b.amount - a.amount);

        // Recent 3 expenses
        const recentExpenses = [...expenses]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 3)
            .map(e => `₹${e.amount.toLocaleString('en-IN')} for "${e.description || e.category}" on ${new Date(e.date).toLocaleDateString()}`);

        const netSavings = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

        // 3. Retrieve Family Welfare Profile if user belongs to a family group
        const family = await FamilyGroup.findOne({
            $or: [
                { admin: userId },
                { 'members.user': userId, 'members.status': 'Approved' }
            ]
        });

        let welfareContext = null;
        if (family) {
            const welfareProfile = await FamilyWelfareProfile.findOne({ familyId: family._id });
            if (welfareProfile) {
                welfareContext = {
                    annualFamilyIncome: welfareProfile.annualFamilyIncome,
                    state: welfareProfile.state,
                    isStudent: welfareProfile.isStudent,
                    isFarmer: welfareProfile.isFarmer,
                    isDisabled: welfareProfile.isDisabled,
                    isSeniorCitizen: welfareProfile.isSeniorCitizen,
                    ownsHome: welfareProfile.ownsHome,
                    eligibleSchemes: welfareProfile.recommendations?.map(r => ({
                        id: r.id,
                        name: r.name,
                        category: r.category,
                        benefits: r.benefits,
                        aiExplanation: r.aiExplanation,
                        requiredDocuments: r.requiredDocuments
                    })) || []
                };
            }
        }

        const geminiResult = await runChatbotGemini({
            name,
            totalIncome,
            totalExpense,
            netSavings,
            savingsRate,
            totalSavings,
            totalInvestment,
            totalLoan,
            monthlyEMI,
            topCategories,
            recentExpenses,
            message,
            welfareContext
        });

        if (geminiResult.success) {
            res.status(200).json({ success: true, reply: geminiResult.transformedResponse });
        } else {
            console.warn("[Chatbot] Gemini call failed, falling back to local NLP reply engine.");
            const context = {
                name, totalIncome, totalExpense, totalSavings,
                totalInvestment, totalLoan, monthlyEMI, topCategories,
                recentExpenses, netSavings, savingsRate, welfareContext
            };
            const reply = generatePersonalizedLocalReply(message, context);
            res.status(200).json({ success: true, reply });
        }
    } catch (error) {
        console.error("Chatbot Controller crashed:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error occurred in chatbot assistant.",
            error: error.message
        });
    }
};

// Upgraded High-Fidelity Local NLP Fallback Engine
function generatePersonalizedLocalReply(message, context) {
    const msg = message.toLowerCase().trim();
    const {
        name, totalIncome, totalExpense, totalSavings,
        totalInvestment, totalLoan, monthlyEMI, topCategories,
        recentExpenses, netSavings, savingsRate, welfareContext
    } = context;

    // Government Welfare Schemes Fallback Queries
    if (/welfare|scheme|government|benefit|pmay|pm-kisan|kisan|ayushman|pmsby|pmjjby|mudra|scholarship/i.test(msg)) {
        if (!welfareContext || !welfareContext.eligibleSchemes || welfareContext.eligibleSchemes.length === 0) {
            return `I see you are asking about Government Welfare Schemes. 

To give you personalized recommendations, please fill out your **Government Welfare Profile** in the family section of the dashboard first! I can then check your eligibility for schemes like PMAY, PM-KISAN, and Ayushman Bharat.`;
        }
        
        const eligibleList = welfareContext.eligibleSchemes.map(s => `• **${s.name}** (${s.category}): ${s.benefits}`).join('\n');
        return `Based on your family's Welfare Profile, here are the government schemes you may qualify for:

${eligibleList}

You can view the full documents checklist, deadlines, and official application links on the **Government Welfare Dashboard** in the family section of the website.`;
    }

    // Greeting
    if (/hello|hi|hey|greetings|good morning|good afternoon/i.test(msg)) {
        return `Hello ${name}! I am your AI Personal Finance Assistant. 

I am connected directly to your ledger accounts. Currently, I see you have logged **₹${totalIncome.toLocaleString('en-IN')}** in income and **₹${totalExpense.toLocaleString('en-IN')}** in expenses.

How can I help you manage your budget, track expenses, analyze investments, or plan savings goals today?`;
    }

    // Expense / Spending
    if (/spend|expense|outgoing|cost|pay|buy|purchase|outgoings|spent/i.test(msg)) {
        const topCatStr = topCategories.length > 0 
            ? `Your highest spending category is **${topCategories[0].category}** at **₹${topCategories[0].amount.toLocaleString('en-IN')}**.`
            : "You haven't recorded any categorised expenses yet.";

        const recentStr = recentExpenses.length > 0
            ? `Here are your most recent outgoings:\n${recentExpenses.map(r => `• ${r}`).join('\n')}`
            : "No recent expenses found in your ledger.";

        return `You have logged a total of **₹${totalExpense.toLocaleString('en-IN')}** in expenses. 

${topCatStr}

${recentStr}

To keep your spending optimized, review your category allocations or consider setting up budget limits in the Dashboard.`;
    }

    // Income
    if (/earn|income|salary|credit|earning|incomes|revenue/i.test(msg)) {
        const status = netSavings >= 0 
            ? `Your net savings rate is a positive **${savingsRate}%** (net flow: +₹${netSavings.toLocaleString('en-IN')}). Great job maintaining a positive balance!`
            : `Your cash flow is negative by **-₹${Math.abs(netSavings).toLocaleString('en-IN')}** (Expenses exceeded Income). We should identify key outgoings to cut back on.`;

        return `You have recorded a total income of **₹${totalIncome.toLocaleString('en-IN')}**.

${status}

Consistent tracking of all salary, freelance, or investment inflows helps me give you accurate budgeting targets.`;
    }

    // Savings / Emergencies
    if (/save|saving|savings|emergency|fd|deposit|fixed deposit|rd/i.test(msg)) {
        const recommendedFundMin = Math.round(totalExpense * 3 / 12);
        const recommendedFundMax = Math.round(totalExpense * 6 / 12);
        const fundStatus = totalSavings >= recommendedFundMin
            ? `Your current savings of **₹${totalSavings.toLocaleString('en-IN')}** are healthy and exceed the 3-month basic emergency threshold (₹${recommendedFundMin.toLocaleString('en-IN')}).`
            : `I recommend trying to build an emergency fund of at least ₹${recommendedFundMin.toLocaleString('en-IN')} to cover 3 months of basic living costs.`;

        return `You have total savings of **₹${totalSavings.toLocaleString('en-IN')}** recorded. 

${fundStatus}

Keeping savings in high-yield options like Fixed Deposits (FDs) or liquid mutual funds ensures security while earning standard interest.`;
    }

    // Investments / Portfolio
    if (/invest|investment|portfolio|asset|stock|share|mutual fund|wealth|crypto|holding/i.test(msg)) {
        const investMsg = totalInvestment > 0
            ? `Your investment portfolio is valued at **₹${totalInvestment.toLocaleString('en-IN')}**. Consistent investing through monthly SIPs is the best path to compounding wealth.`
            : "You haven't added any investments to your portfolio yet. Diversified index funds, mutual funds, or blue-chip stocks are excellent starting points.";

        return `${investMsg}

Check out the 'Market Intelligence' tab to analyze Nifty 50 stocks, check live quotes, and track your asset holdings in detail!`;
    }

    // Loans / Debt
    if (/loan|debt|emi|outstanding|lender|borrow/i.test(msg)) {
        if (totalLoan === 0) {
            return "Good news! You have no outstanding loans or EMI liabilities recorded in your ledger. Maintaining a debt-free status keeps your cash flow highly flexible.";
        }

        const emiRatio = totalIncome > 0 ? Math.round((monthlyEMI / totalIncome) * 100) : 0;
        const emiStatus = emiRatio > 35
            ? `⚠️ Warning: Your EMI commitments represent **${emiRatio}%** of your monthly income. This is higher than the recommended 35% ceiling and may strain your liquidity.`
            : `Your EMI commitments represent **${emiRatio}%** of your monthly income, which is within the safe debt-to-income boundary (<35%).`;

        return `You have **₹${totalLoan.toLocaleString('en-IN')}** in outstanding liabilities, with a total monthly EMI outflow of **₹${monthlyEMI.toLocaleString('en-IN')}**.

${emiStatus}

To clear debt faster, consider the *Debt Avalanche* method (paying off the highest interest rate loans first) or *Debt Snowball* (clearing small balances first).`;
    }

    // Budgeting / 50-30-20
    if (/budget|limit|plan|50\/30\/20|allocate|cap/i.test(msg)) {
        const needsLimit = Math.round(totalIncome * 0.5);
        const wantsLimit = Math.round(totalIncome * 0.3);
        const savingsLimit = Math.round(totalIncome * 0.2);

        return `Using the popular **50/30/20 Budgeting Rule** on your income of **₹${totalIncome.toLocaleString('en-IN')}**, here are your ideal allocations:

• 🏠 **Needs (50%)**: ₹${needsLimit.toLocaleString('en-IN')} *(Rent, bills, grocery)*
• 🎮 **Wants (30%)**: ₹${wantsLimit.toLocaleString('en-IN')} *(Dining out, shopping, leisure)*
• 🐖 **Savings/Debt (20%)**: ₹${savingsLimit.toLocaleString('en-IN')} *(SIP, emergency fund, EMI)*

Currently, your actual total expenses are **₹${totalExpense.toLocaleString('en-IN')}** (${Math.round((totalExpense / (totalIncome || 1)) * 100)}% of income).`;
    }

    // Financial Health Summary
    if (/summary|status|overview|dashboard|health|track|report/i.test(msg)) {
        return `Here is your real-time **Financial Health Summary** (${name}):

💰 **Total Income**: ₹${totalIncome.toLocaleString('en-IN')}
💸 **Total Expenses**: ₹${totalExpense.toLocaleString('en-IN')}
📊 **Net Balance**: ₹${netSavings.toLocaleString('en-IN')} (Savings Rate: ${savingsRate}%)
🏦 **Savings Balance**: ₹${totalSavings.toLocaleString('en-IN')}
📈 **Investments Value**: ₹${totalInvestment.toLocaleString('en-IN')}
🏛️ **Outstanding Debt**: ₹${totalLoan.toLocaleString('en-IN')} (EMI: ₹${monthlyEMI.toLocaleString('en-IN')})

Let me know if you would like custom advice on reducing expenses, starting a budget plan, or resolving loan commitments.`;
    }

    // Default fallback
    return `I'd love to help you with that! 

As your personal finance assistant, I have access to your ledger. Currently, you have logged **₹${totalIncome.toLocaleString('en-IN')}** in income, **₹${totalExpense.toLocaleString('en-IN')}** in expenses, and **₹${totalSavings.toLocaleString('en-IN')}** in savings.

Could you specify what details you'd like to discuss? I can:
1. Review your **spending patterns** ("what are my expenses?")
2. Check your **loan/EMI thresholds** ("show my debt status")
3. Guide you on **budget boundaries** ("explain my 50/30/20 budget")
4. Provide a full **portfolio analysis** ("how is my portfolio doing?")`;
}

export const runChatbotGemini = async (data) => {
    const API_KEY = process.env.GEMINI_API_KEY;
    const isApiKeyMissing = !API_KEY || API_KEY.includes('your_gemini') || API_KEY === '';

    const welfarePrompt = data.welfareContext 
        ? `
Government Welfare Profile of User's Family:
- State: ${data.welfareContext.state}
- Annual Income: ₹${data.welfareContext.annualFamilyIncome.toLocaleString('en-IN')}
- Student present: ${data.welfareContext.isStudent ? 'Yes' : 'No'}
- Farmer present: ${data.welfareContext.isFarmer ? 'Yes' : 'No'}
- Disabled members: ${data.welfareContext.isDisabled ? 'Yes' : 'No'}
- Senior Citizens: ${data.welfareContext.isSeniorCitizen ? 'Yes' : 'No'}
- Owns a home: ${data.welfareContext.ownsHome ? 'Yes' : 'No'}

Matching Government Welfare Schemes (Eligible for recommendation):
${data.welfareContext.eligibleSchemes.length > 0 
  ? data.welfareContext.eligibleSchemes.map(s => `  * ${s.name} (${s.category})
    Benefits: ${s.benefits}
    Why Recommended: ${s.aiExplanation}
    Required Documents: ${s.requiredDocuments.join(', ')}`).join('\n')
  : '  * No matching welfare schemes.'}
`
        : '';

    const prompt = `You are a professional and helpful assistant. You have access to the user's actual live database records.
            
User Information:
- Name: ${data.name}
- Total Income: ₹${data.totalIncome.toLocaleString('en-IN')}
- Total Expenses: ₹${data.totalExpense.toLocaleString('en-IN')}
- Net Balance: ₹${data.netSavings.toLocaleString('en-IN')} (Savings Rate: ${data.savingsRate}%)
- Savings Balance: ₹${data.totalSavings.toLocaleString('en-IN')}
- Portfolio Value: ₹${data.totalInvestment.toLocaleString('en-IN')}
- Outstanding Loans: ₹${data.totalLoan.toLocaleString('en-IN')} (Monthly EMI: ₹${data.monthlyEMI.toLocaleString('en-IN')})
- Top Categories: ${data.topCategories.slice(0, 3).map(c => `${c.category}: ₹${c.amount.toLocaleString('en-IN')}`).join(', ')}
- Recent transactions:
${data.recentExpenses.length > 0 ? data.recentExpenses.map(r => `  * ${r}`).join('\n') : '  * No transactions recorded.'}
${welfarePrompt}

User's Question: "${data.message}"
            
Answer the user's question directly, helpfully, and professionally. If the question is related to finance or their accounts, use their actual numbers and ground your advice in their real budget, spending, and investments. If they ask about eligible government welfare schemes, explain their options, benefits, and required documents using their welfare profile details above. If the question is general or unrelated to finance, feel free to answer it completely and accurately without trying to steer the conversation back to finance. Avoid giving legal or specific financial buying advice, but offer educational and general guidance.`;

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
            console.log(`[Chatbot] Requesting model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text().trim();
            return {
                success: true,
                prompt,
                rawResponse: text,
                transformedResponse: text,
                error: null
            };
        } catch (error) {
            console.warn(`[Chatbot] Model ${modelName} failed:`, error.message);
            lastError = error.message;
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
