const BASE_URL = 'http://localhost:5000/api';

async function runDiagnostics() {
    const symbols = ['RELIANCE', 'TATASTEEL', 'INFY', 'TCS'];
    console.log("==================================================");
    console.log("🚀 STARTING STOCK MARKET DIAGNOSTIC VERIFICATION");
    console.log("==================================================");

    for (const sym of symbols) {
        console.log(`\n🔍 Requesting debug diagnostics for: ${sym}...`);
        try {
            const res = await fetch(`${BASE_URL}/debug/stock/${sym}`);
            const data = await res.json();
            
            console.log(`Status Success: ${data.success}`);
            console.log("Auth Status:", JSON.stringify(data.authStatus, null, 2));
            console.log("Symbol Resolved:", JSON.stringify(data.symbolResolved, null, 2));
            console.log("Request Payload:", JSON.stringify(data.requestPayload, null, 2));
            console.log("Transformed Data:", JSON.stringify(data.transformedData, null, 2));
            console.log("Errors:", data.errors);
            console.log("--------------------------------------------------");
        } catch (e) {
            console.error(`❌ Diagnostic request failed for ${sym}:`, e.message);
        }
    }

    console.log("\n==================================================");
    console.log("📈 VERIFYING PUBLIC QUOTE ENDPOINT FALLBACKS");
    console.log("==================================================");
    
    try {
        const rand = Math.floor(Math.random() * 10000);
        const email = `testuser_${rand}@example.com`;
        const phone = `99999${rand.toString().padStart(5, '0')}`;
        
        const registerRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: 'Test Diagnostic User',
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
            console.log(`\n📊 Fetching Quote for ${sym}...`);
            const quoteRes = await fetch(`${BASE_URL}/stocks/quote/${sym}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const quoteData = await quoteRes.json();
            console.log("Quote Response Data:", JSON.stringify(quoteData.data, null, 2));

            console.log(`\n📉 Fetching Technicals for ${sym}...`);
            const techRes = await fetch(`${BASE_URL}/stocks/technical/${sym}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const techData = await techRes.json();
            console.log("Technical Response Data:", JSON.stringify(techData.data, null, 2));
        }
    } catch (e) {
        console.error("❌ Error running public endpoint verification:", e.message);
    }
}

runDiagnostics();
