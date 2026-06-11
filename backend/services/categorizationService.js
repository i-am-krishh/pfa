import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

// Rules dictionary for fast rule-based classification
const KEYWORD_RULES = [
    { category: 'Food', keywords: ['SWIGGY', 'ZOMATO', 'FOOD', 'RESTAURANT', 'CAFE', 'SWEETS', 'BAKERY', 'HOTEL', 'PIZZA', 'DOMINOS', 'EAT', 'DINING', 'STARBUCKS', 'KFC', 'MC DONALD'] },
    { category: 'Travel', keywords: ['UBER', 'OLA', 'METRO', 'AUTO', 'CAB', 'IRCTC', 'RAILWAY', 'FLIGHT', 'INDIGO', 'TRAVEL', 'AIRWAYS', 'BUS', 'RAPIDO', 'MAKE MY TRIP', 'YATRA', 'AIRASIA'] },
    { category: 'Fuel', keywords: ['PETROL', 'FUEL', 'SHELL', 'HPCL', 'BPCL', 'IOCL', 'PUMP', 'CNG'] },
    { category: 'Shopping', keywords: ['AMAZON', 'FLIPKART', 'MYNTRA', 'AJIO', 'MALL', 'SUPERMARKET', 'MART', 'GROCERY', 'RETAIL', 'DEPT STORE', 'SPAR', 'DMART', 'BIGBASKET', 'BLINKIT', 'ZEPTO', 'APEX', 'CLOTHES', 'FASHION', 'MEESHO', 'RELIANCE DIGITAL', 'CHROME'] },
    { category: 'Healthcare', keywords: ['APOLLO', 'HOSPITAL', 'PHARMACY', 'CLINIC', 'MEDPLUS', 'DENTAL', 'MEDICINE', 'LABS', 'DOCTOR', 'CARE', 'PATHOLOGY', 'HEALTH', 'MEDS'] },
    { category: 'Entertainment', keywords: ['NETFLIX', 'SPOTIFY', 'PRIME', 'HOTSTAR', 'SONY LIV', 'BOOKMYSHOW', 'CINEMA', 'THEATRE', 'MOVES', 'GAME', 'PLAYSTATION', 'STEAM', 'YOUTUBE PREMIUM', 'DISNEY'] },
    { category: 'Investment', keywords: ['ZERODHA', 'GROWW', 'MUTUAL FUND', 'SIP', 'NPS', 'STOCK', 'SECURITIES', 'DEMAT', 'INDMONEY', 'ANGEL ONE', 'UPSTOX', 'TREASURY', 'GOLD', 'COINDCX', 'WNDR'] },
    { category: 'EMI', keywords: ['EMI', 'LOAN', 'FINANCE', 'HDFC HOME LOAN', 'SBI LOAN', 'CREDIT CARD EMI', 'FINSERV', 'CHOLA', 'AUTO LOAN', 'MORTGAGE'] },
    { category: 'Education', keywords: ['SCHOOL', 'COLLEGE', 'UNIVERSITY', 'FEES', 'TUITION', 'COURSERA', 'UDEMY', 'ACADEMY', 'CLASS', 'EDUTECH', 'BYJUS'] },
    { category: 'Bills', keywords: ['INSURANCE', 'PREMIUM', 'TAX', 'MUNICIPAL', 'BILLPAY', 'PAYTM BILLS', 'CRED', 'ELECTRICITY', 'WATER', 'GAS', 'INTERNET', 'BROADBAND', 'MOBILE', 'TELECOM', 'JIO', 'AIRTEL', 'VI', 'DTH', 'TATA PLAY', 'RECHARGE', 'ACT FIBERNET'] }
];

export const classifyRuleBased = (description) => {
    const descUpper = description.toUpperCase();

    // Check income keywords first
    if (/salary|payroll|credit-salary|sal-|^sal\s/i.test(descUpper)) {
        return { category: 'Salary', isIncome: true, ruleMatched: true };
    }
    if (/interest|refund|cash deposit|dividend|cash-in/i.test(descUpper)) {
        return { category: 'Other', isIncome: true, ruleMatched: true };
    }

    for (const rule of KEYWORD_RULES) {
        for (const kw of rule.keywords) {
            if (descUpper.includes(kw)) {
                return { category: rule.category, isIncome: false, ruleMatched: true };
            }
        }
    }

    return { category: 'Other', isIncome: false, ruleMatched: false };
};

// Batch AI Categorization using Gemini AI
export const classifyAIBatch = async (transactions) => {
    // 1. Separate transactions into rule-matched and ones needing AI classification
    const results = transactions.map(t => {
        const ruleResult = classifyRuleBased(t.description);
        return {
            ...t,
            category: ruleResult.category,
            type: ruleResult.isIncome ? 'income' : t.type || 'expense',
            confidence: ruleResult.ruleMatched ? 0.95 : null
        };
    });

    const pendingAI = results.filter(r => r.confidence === null);
    if (pendingAI.length === 0) return results;

    // 2. Classify pending using Gemini AI
    if (!API_KEY || API_KEY === 'your_gemini_api_key') {
        console.warn("[CategorizationService] Gemini API Key is missing. Using rule-based fallback.");
        return results.map(r => r.confidence === null ? { ...r, category: 'Other', confidence: 0.5 } : r);
    }

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        
        // Try multiple models in order
        const models = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-pro"];
        let success = false;
        let aiCategories = [];

        // Prepare the batch prompt
        const descriptions = pendingAI.map(t => t.description);
        const prompt = `You are a financial transaction classification engine.
Classify each bank transaction description in the input array into exactly one of these categories:
- Food
- Shopping
- Travel
- Fuel
- Bills
- EMI
- Salary
- Investment
- Healthcare
- Education
- Entertainment
- Other

Return the classification results as a JSON array of objects. Each object must contain:
{
  "category": "String category name from the list",
  "confidence": Float confidence score between 0.0 and 1.0
}

Input Descriptions:
${JSON.stringify(descriptions, null, 2)}

Ensure you return ONLY a raw JSON array matching the length of the input. No explanation, no Markdown formatting tags like \`\`\`json.`;

        for (const modelName of models) {
            try {
                console.log(`[CategorizationService] Calling Gemini model: ${modelName} for batch of ${descriptions.length}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                const text = result.response.text().trim();
                
                // Clean markdown wrappers if returned
                const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
                aiCategories = JSON.parse(cleanText);

                if (Array.isArray(aiCategories) && aiCategories.length === pendingAI.length) {
                    success = true;
                    break;
                }
            } catch (err) {
                console.error(`[CategorizationService] Model ${modelName} failed:`, err.message);
            }
        }

        if (success) {
            // Merge AI results back
            let aiIdx = 0;
            return results.map(r => {
                if (r.confidence === null) {
                    const aiRes = aiCategories[aiIdx++];
                    return {
                        ...r,
                        category: aiRes?.category || 'Other',
                        confidence: aiRes?.confidence || 0.7
                    };
                }
                return r;
            });
        }
    } catch (error) {
        console.error("[CategorizationService] AI Categorization crashed:", error.message);
    }

    // Default fallback
    return results.map(r => r.confidence === null ? { ...r, category: 'Other', confidence: 0.5 } : r);
};
