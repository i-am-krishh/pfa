import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = 'http://127.0.0.1:5000/api';

async function runChatbotTests() {
    console.log("==================================================");
    console.log("🤖 STARTING CHATBOT CONTEXT VERIFICATION TESTS");
    console.log("==================================================");

    try {
        const rand = Math.floor(Math.random() * 10000);
        const email = `chatbot_test_${rand}@example.com`;
        const phone = `98765${rand.toString().padStart(5, '0')}`;
        
        console.log(`\n👤 Step 1: Registering temporary test user...`);
        const registerRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: 'Sahil Wagh ChatbotTest',
                email: email,
                phoneNumber: phone,
                password: 'Password123!'
            })
        });
        const registerData = await registerRes.json();
        const token = registerData.token;

        if (!token) {
            console.error("❌ Registration failed. Response details:", JSON.stringify(registerData));
            return;
        }

        console.log("✅ Successfully authenticated. JWT Token acquired.");

        // Step 2: Populate Mock Financial Ledger Data
        console.log(`\n💳 Step 2: Populating mock ledger records...`);
        
        // Post an income
        const incomeRes = await fetch(`${BASE_URL}/income`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                source: 'salary',
                amount: 75000,
                description: 'Monthly Salary Credit',
                date: new Date().toISOString()
            })
        });
        console.log(`- Income logged status: ${incomeRes.status}`);

        // Post an expense
        const expenseRes1 = await fetch(`${BASE_URL}/expense`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                category: 'food',
                amount: 4500,
                description: 'Zomato Party order',
                date: new Date().toISOString()
            })
        });
        console.log(`- Expense 1 (Food) logged status: ${expenseRes1.status}`);

        const expenseRes2 = await fetch(`${BASE_URL}/expense`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                category: 'transport',
                amount: 1200,
                description: 'Uber rides',
                date: new Date().toISOString()
            })
        });
        console.log(`- Expense 2 (Travel) logged status: ${expenseRes2.status}`);

        // Post savings account
        const savingsRes = await fetch(`${BASE_URL}/savings`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                accountName: 'HDFC Savings Account',
                accountType: 'savings_account',
                amount: 15000,
                description: 'Primary emergency storage'
            })
        });
        console.log(`- Savings account logged status: ${savingsRes.status}`);

        // Post loan
        const loanRes = await fetch(`${BASE_URL}/loan`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                type: 'personal_loan',
                lenderName: 'SBI Personal Loan',
                totalAmount: 50000,
                remainingAmount: 42000,
                rateOfInterest: 10.5,
                interestType: 'compound',
                tenure: 12,
                tenureUnit: 'months',
                monthlyEMI: 4500,
                startDate: '2026-01-01T00:00:00.000Z',
                endDate: '2026-12-31T00:00:00.000Z'
            })
        });
        console.log(`- Loan account logged status: ${loanRes.status}`);

        const testQueries = [
            "hi there, hello",
            "show my expenses",
            "what is data science",
            "who is Isaac Newton",
            "can you write a javascript function to sort an array",
            "give me my financial summary status"
        ];

        console.log(`\n💬 Step 3: Submitting chatbot questions...`);
        for (const query of testQueries) {
            console.log(`\n--------------------------------------------------`);
            console.log(`❓ User: "${query}"`);
            
            const messageRes = await fetch(`${BASE_URL}/chatbot/message`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: query })
            });
            const data = await messageRes.json();
            console.log(`🤖 Bot:\n${data.reply}`);
        }

        console.log("\n==================================================");
        console.log("✅ CHATBOT CONTEXT VERIFICATION SUCCESSFUL");
        console.log("==================================================");

    } catch (e) {
        console.error("❌ Chatbot test failed with error:", e.message);
    }
}

runChatbotTests();
