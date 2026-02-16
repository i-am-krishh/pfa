import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

export const getChatbotResponse = async (req, res) => {
    try {
        const { message } = req.body;

        // Check if API Key is configured
        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY || API_KEY === 'your_gemini_api_key') {
            console.error("GEMINI_API_KEY is missing or invalid.");
            return res.status(500).json({
                success: false,
                message: "Server Configuration Error: GEMINI_API_KEY is not set. Please update .env and restart backend."
            });
        }

        if (!message) {
            return res.status(400).json({ success: false, message: "Message is required" });
        }

        // Initialize inside the request to ensure it uses the latest env var (if possible via restart) and handles missing key gracefully
        const genAI = new GoogleGenerativeAI(API_KEY);

        const prompt = `You are a professional and helpful personal finance assistant. Your goal is to help users with their financial questions, budgeting, investment advice, and general financial literacy.
    
    User's Question: "${message}"
    
    Provide a clear, concise, and helpful answer. If the question is not related to finance, politely steer the conversation back to finance or stating that you can only help with finance-related topics. Avoid giving specific legal or professional financial advice (like 'buy this stock now'), but rather provide educational and general guidance.`;

        // List of models to try in order of preference
        const modelsToTry = ["gemini-2.5-flash", "gemini-pro", "gemini-1.0-pro"];

        let lastError = null;
        let success = false;
        let replyText = "";

        for (const modelName of modelsToTry) {
            try {
                console.log(`Attempting to use model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                const response = await result.response;
                replyText = response.text();
                success = true;
                break; // Success! Exit loop.
            } catch (error) {
                console.error(`Model ${modelName} failed:`, error.message);
                lastError = error;
                // Continue to next model
            }
        }

        if (success) {
            res.status(200).json({ success: true, reply: replyText });
        } else {
            throw lastError; // Fallback to main catch block
        }
    } catch (error) {
        console.error("All chatbot models failed:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get response from Gemini API. Please check your API Key and billing in Google AI Studio.",
            error: error.message,
            details: error.toString()
        });
    }
};
