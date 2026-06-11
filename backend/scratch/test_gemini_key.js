import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("No Gemini API key configured. Set GEMINI_API_KEY before running this script.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

const models = [
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-2.0-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-pro-latest"
];

async function testModel(modelName) {
    console.log(`\nTesting Model: ${modelName}...`);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Say hello");
        const response = await result.response;
        console.log(`✅ Success! Response: ${response.text().trim()}`);
        return true;
    } catch (e) {
        console.error(`❌ Failed: ${e.message}`);
        return false;
    }
}

async function run() {
    for (const model of models) {
        await testModel(model);
    }
}

run();
