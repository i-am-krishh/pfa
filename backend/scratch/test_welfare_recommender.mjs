import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = 'http://127.0.0.1:5000/api';

async function runWelfareRecommenderTest() {
    console.log("==========================================================");
    console.log("🎯 STARTING GOVERNMENT WELFARE RECOMMENDER INTEGRATION TESTS");
    console.log("==========================================================");

    try {
        const rand = Math.floor(Math.random() * 10000);
        const email = `welfare_test_${rand}@example.com`;
        const phone = `98875${rand.toString().padStart(5, '0')}`;
        
        console.log(`\n👤 Step 1: Registering temporary test user...`);
        const registerRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: 'Sahil WelfareTester',
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
            body: JSON.stringify({ name: 'Tester Welfare Family' })
        });
        const familyData = await familyRes.json();
        const familyId = familyData.data?._id;
        
        if (!familyId) {
            console.error("❌ Family creation failed. Response:", JSON.stringify(familyData));
            return;
        }
        console.log(`✅ Family created. Family ID: ${familyId}`);

        console.log(`\n📥 Step 3: Fetching unconfigured welfare profile...`);
        const getProfileRes = await fetch(`${BASE_URL}/welfare/profile/${familyId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const getProfileData = await getProfileRes.json();
        
        if (getProfileData.success && !getProfileData.data) {
            console.log(`✅ Returned unconfigured status successfully. Schemes count in registry: ${getProfileData.allSchemes?.length}`);
        } else {
            console.error("❌ Expected empty/unconfigured profile first. Got:", JSON.stringify(getProfileData));
        }

        console.log(`\n⚙️ Step 4: Submitting family demographic profile inputs...`);
        // Farmer family residing in Karnataka, who doesn't own a house, has students
        const profilePayload = {
            annualFamilyIncome: 150000,
            familySize: 4,
            state: 'Karnataka',
            memberAges: [38, 35, 12, 8],
            gender: 'mixed',
            occupation: 'agriculture',
            isStudent: true,
            isFarmer: true,
            isDisabled: false,
            isSeniorCitizen: false,
            ownsHome: false
        };

        const updateRes = await fetch(`${BASE_URL}/welfare/profile/${familyId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(profilePayload)
        });
        const updateData = await updateRes.json();
        
        if (updateRes.ok) {
            console.log("✅ PROFILE UPDATED & RECOMMENDATIONS SUCCESSFULLY GENERATED!");
            const recs = updateData.data.recommendations;
            console.log(`\nMatched Schemes Count: ${recs.length}`);
            recs.forEach(r => {
                console.log(`- [${r.category}] ${r.name} (Score: ${r.eligibilityScore}%, Benefits: ${r.benefits})`);
                console.log(`  AI Explanation: ${r.aiExplanation}`);
                console.log(`  Docs: ${r.requiredDocuments.join(', ')}`);
            });
        } else {
            console.error("❌ Profile update failed:", JSON.stringify(updateData));
            return;
        }

        console.log(`\n📝 Step 5: Logging scheme application ('PM-KISAN' marked as Applied)...`);
        const applyRes = await fetch(`${BASE_URL}/welfare/apply/${familyId}/pm-kisan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'Applied' })
        });
        const applyData = await applyRes.json();
        
        if (applyRes.ok && applyData.data.appliedSchemes.some(s => s.schemeId === 'pm-kisan' && s.status === 'Applied')) {
            console.log("✅ Scheme successfully marked as Applied in database!");
        } else {
            console.error("❌ Failed to log scheme application:", JSON.stringify(applyData));
        }

        console.log(`\n💬 Step 6: Testing AI Chatbot integration query...`);
        const chatbotRes = await fetch(`${BASE_URL}/chatbot`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message: 'What schemes are available for my family?' })
        });
        const chatbotData = await chatbotRes.json();

        if (chatbotRes.ok) {
            console.log("✅ CHATBOT RESPONDED SUCCESSFULLY!");
            console.log("\nChatbot Response:");
            console.log(chatbotData.reply);
        } else {
            console.error("❌ Chatbot query failed:", JSON.stringify(chatbotData));
        }

    } catch (e) {
        console.error("❌ Integration test script crashed:", e.message);
    }
}

runWelfareRecommenderTest();
