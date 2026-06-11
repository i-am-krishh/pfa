import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = 'http://127.0.0.1:5000/api';

async function runGoalPlannerTest() {
    console.log("==================================================");
    console.log("🎯 STARTING FAMILY GOAL PLANNER VERIFICATION TESTS");
    console.log("==================================================");

    try {
        const rand = Math.floor(Math.random() * 10000);
        const email = `goal_planner_test_${rand}@example.com`;
        const phone = `97765${rand.toString().padStart(5, '0')}`;
        
        console.log(`\n👤 Step 1: Registering temporary test user...`);
        const registerRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: 'Sahil GoalTest',
                email: email,
                phoneNumber: phone,
                password: 'Password123!'
            })
        });
        const registerData = await registerRes.json();
        const token = registerData.token;

        if (!token) {
            console.error("❌ Registration failed. Response:", JSON.stringify(registerData));
            return;
        }
        console.log("✅ Successfully authenticated. JWT Token acquired.");

        console.log(`\n👨‍👩‍👧‍👦 Step 2: Creating family group...`);
        const familyRes = await fetch(`${BASE_URL}/family/create`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: 'Wagh Family' })
        });
        const familyData = await familyRes.json();
        const familyId = familyData.data?._id;
        
        if (!familyId) {
            console.error("❌ Family creation failed. Response:", JSON.stringify(familyData));
            return;
        }
        console.log(`✅ Family created. Family ID: ${familyId}`);

        console.log(`\n🔮 Step 3: Triggering AI Goal Planner Analyze request...`);
        const analyzeRes = await fetch(`${BASE_URL}/family/goal-planner/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                familyId: familyId,
                goalType: 'car',
                goalName: 'Family EV SUV',
                targetAmount: 1800000,
                currentSavedAmount: 400000,
                deadlineMonths: 24,
                priority: 'high',
                riskProfile: 'medium'
            })
        });

        const analyzeData = await analyzeRes.json();
        
        if (analyzeRes.ok) {
            console.log("✅ GOAL PLANNER COMPLETED SUCCESSFULLY WITH 201 CREATED!");
            console.log("\nSample Stored Document (aiSuggestion snippet):");
            console.log(JSON.stringify(analyzeData.data.aiSuggestion, null, 2));
        } else {
            console.error(`❌ Goal Planner failed with status ${analyzeRes.status}. Error:`, JSON.stringify(analyzeData));
        }

    } catch (e) {
        console.error("❌ Test script crashed:", e.message);
    }
}

runGoalPlannerTest();
