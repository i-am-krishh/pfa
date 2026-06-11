import { GoogleGenerativeAI } from "@google/generative-ai";

const keys = process.env.GEMINI_API_KEY
    ? [process.env.GEMINI_API_KEY]
    : [];

async function listModelsForKey(API_KEY) {
    console.log(`\n--- Listing Models for API Key: ${API_KEY.slice(0, 15)}... ---`);
    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        // Under the JS SDK, listing models is not directly on genAI unless we use vertex or client, 
        // but let's try calling the listModels method if it exists, or fetch directly.
        // Let's do a direct fetch to the endpoint:
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (res.ok) {
            console.log("✅ Success! Models list retrieved.");
            console.log(data.models.map(m => m.name));
        } else {
            console.error(`❌ API Error Response (Status ${res.status}):`, JSON.stringify(data));
        }
    } catch (e) {
        console.error(`❌ Exception: ${e.message}`);
    }
}

async function run() {
    if (keys.length === 0) {
        console.error("No Gemini API key configured. Set GEMINI_API_KEY before running this script.");
        return;
    }

    for (const key of keys) {
        await listModelsForKey(key);
    }
}

run();
