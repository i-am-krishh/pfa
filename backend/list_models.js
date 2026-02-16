import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("No API Key found in .env");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

async function listModels() {
    try {
        // There isn't a direct listModels on the client in some versions, 
        // but we can try to inspect the error by making a dummy request or just assume standard models.
        console.log("Testing gemini-1.5-flash...");
        const model1 = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        try {
            await model1.generateContent("Hello");
            console.log("SUCCESS: gemini-1.5-flash works!");
        } catch (e) {
            console.log("FAIL: gemini-1.5-flash failed - " + e.message);
        }

        console.log("Testing gemini-pro...");
        const model2 = genAI.getGenerativeModel({ model: "gemini-pro" });
        try {
            await model2.generateContent("Hello");
            console.log("SUCCESS: gemini-pro works!");
        } catch (e) {
            console.log("FAIL: gemini-pro failed - " + e.message);
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
