const BASE_URL = 'http://localhost:5000/api';

async function runTwelveDataDiagnostics() {
    const symbols = ['RELIANCE', 'TCS', 'INFY', 'TATASTEEL', 'HDFCBANK'];
    console.log("==================================================");
    console.log("🚀 STARTING TWELVE DATA MIGRATION VERIFICATION");
    console.log("==================================================");

    for (const sym of symbols) {
        console.log(`\n🔍 Requesting Twelve Data debug diagnostics for: ${sym}...`);
        try {
            const res = await fetch(`${BASE_URL}/debug/stock/${sym}`);
            const data = await res.json();
            
            console.log(`Status Success: ${data.success}`);
            console.log("API Provider:", data.apiProvider);
            console.log("API Request URL (Masked):", data.apiRequest);
            console.log("Raw Response Payload:", JSON.stringify(data.rawResponse, null, 2));
            console.log("Transformed Response Schema:", JSON.stringify(data.transformedResponse, null, 2));
            console.log("Errors Reported:", data.errors);
            console.log("--------------------------------------------------");
        } catch (e) {
            console.error(`❌ Diagnostic request failed for ${sym}:`, e.message);
        }
    }

    console.log("\n==================================================");
    console.log("📈 VERIFYING PUBLIC QUOTE & TECHNICAL ENDPOINTS");
    console.log("==================================================");
    
    try {
        const rand = Math.floor(Math.random() * 10000);
        const email = `twelveuser_${rand}@example.com`;
        const phone = `88888${rand.toString().padStart(5, '0')}`;
        
        // Register temp user to get JWT token
        const registerRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: 'Twelve Data Migration Verifier',
                email: email,
                phoneNumber: phone,
                password: 'Password123!'
            })
        });
        const registerData = await registerRes.json();
        const token = registerData.token;

        if (!token) {
            console.error("❌ Failed to obtain JWT token for public endpoint verification. Details:", JSON.stringify(registerData));
            return;
        }

        console.log("✅ Successfully authenticated. JWT Token acquired.");

        const testSymbols = ['RELIANCE', 'TATASTEEL'];
        for (const sym of testSymbols) {
            console.log(`\n📊 Fetching Public Quote for ${sym}...`);
            const quoteRes = await fetch(`${BASE_URL}/stocks/quote/${sym}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const quoteData = await quoteRes.json();
            console.log("Quote Response Data:", JSON.stringify(quoteData, null, 2));

            console.log(`\n📉 Fetching Public Technicals for ${sym}...`);
            const techRes = await fetch(`${BASE_URL}/stocks/technical/${sym}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const techData = await techRes.json();
            console.log("Technical Response Data:", JSON.stringify(techData, null, 2));
        }
    } catch (e) {
        console.error("❌ Error running public endpoint verification:", e.message);
    }
}

runTwelveDataDiagnostics();
