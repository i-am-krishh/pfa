import { GoogleGenerativeAI } from "@google/generative-ai";
import * as twelveDataService from '../services/yahooFinanceService.js';
import dotenv from 'dotenv';
dotenv.config();

/**
 * POST /api/market/ai-analysis
 * Generates stock summary, strengths, risks, suitability, and portfolio impact using Google Gemini on live data.
 */
export const getStockAIAnalysis = async (req, res) => {
    try {
        const { stockSymbol, userPortfolio = [], familyGoals = [], riskProfile = 'medium' } = req.body;

        if (!stockSymbol) {
            return res.status(400).json({
                success: false,
                message: 'stockSymbol is required.'
            });
        }

        const symbol = stockSymbol.trim().toUpperCase();
        
        // 1. Fetch live quote and technical indicators
        let quote = null;
        let technicals = null;
        try {
            quote = await twelveDataService.getQuote(symbol);
            technicals = await twelveDataService.getTechnicalIndicators(symbol);
        } catch (e) {
            console.warn(`[MarketAIController] Failed to fetch live data for ${symbol}:`, e.message);
        }

        // 2. If API fails to get quote, show API Error
        if (!quote || quote.currentPrice === null || quote.currentPrice === undefined) {
            return res.status(500).json({
                success: false,
                message: 'API Error: Market data unavailable for AI analysis.'
            });
        }

        const geminiResult = await runStockAnalyzerGemini({
            symbol,
            quote,
            technicals,
            riskProfile,
            userPortfolio,
            familyGoals
        });

        if (geminiResult.success) {
            return res.status(200).json({
                success: true,
                analysis: geminiResult.transformedResponse
            });
        } else {
            return res.status(503).json({
                error: "Gemini API unavailable"
            });
        }

    } catch (error) {
        console.error('Market AI Controller crash:', error);
        res.status(500).json({
            success: false,
            message: 'API Error: Internal server error during AI analysis.'
        });
    }
};

export const runStockAnalyzerGemini = async (data) => {
    const API_KEY = process.env.GEMINI_API_KEY;
    const isApiKeyMissing = !API_KEY || API_KEY.includes('your_gemini') || API_KEY === '';

    const prompt = `You are a certified professional financial planner, stock research analyst, and investment advisor. 
Generate a comprehensive, tailored stock analysis report in JSON format based on the following client and live market data:

LIVE MARKET DATA:
- Target Stock Symbol: ${data.symbol}
- Current Live Price: ${data.quote.currentPrice ? `₹${data.quote.currentPrice}` : 'Unavailable'}
- Day High / Low: ${data.quote.dayHigh && data.quote.dayLow ? `₹${data.quote.dayLow} - ₹${data.quote.dayHigh}` : 'Unavailable'}
- Volume: ${data.quote.volume ? data.quote.volume.toLocaleString() : 'Unavailable'}
- Change / Change %: ${data.quote.change !== null ? `₹${data.quote.change} (${data.quote.changePercent?.toFixed(2)}%)` : 'Unavailable'}
- Technical Indicators: RSI(14) = ${data.technicals?.rsi !== null ? data.technicals.rsi : 'Unavailable'}, 20 SMA = ${data.technicals?.sma !== null ? `₹${data.technicals.sma}` : 'Unavailable'}

CLIENT DATA:
- Client Risk Profile: ${data.riskProfile}
- Client Current Portfolio Holdings: ${JSON.stringify(data.userPortfolio)}
- Client Family Financial Goals: ${JSON.stringify(data.familyGoals)}

CRITICAL GUIDELINES:
1. Do not guarantee any specific returns. Use terms like "expected historical average" or "projected".
2. Always present details in a supportive, professional, and clear tone.
3. The response MUST be a valid JSON object matching the schema below.
4. Do NOT include any text before or after the JSON, and do NOT wrap it in markdown code blocks like \`\`\`json. Respond ONLY with the raw JSON string.
5. Base your strengths, risks, trends, and suitabilities directly on the live price and technical indicators provided above.

JSON RESPONSE SCHEMA:
{
  "stockSummary": "string (brief overview of the company, its market position, and recent business performance)",
  "strengths": ["string", "string", "string"],
  "risks": ["string", "string", "string"],
  "diversificationAdvice": "string (explanation of how holding this stock affects the client's portfolio concentration/sector diversification)",
  "longTermSuitability": "string (assessment of whether this stock is suitable for the client's risk profile and family goals)",
  "portfolioImpact": "string (recommendation on weight limits, holding sizes, or systematic deployment instructions)",
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
            console.log(`[MarketAIController] Attempting Gemini query using model: ${modelName}`);
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
            console.warn(`[MarketAIController] Model ${modelName} call failed:`, err.message);
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
