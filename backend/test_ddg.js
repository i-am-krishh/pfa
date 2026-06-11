async function testDDG() {
    try {
        const query = encodeURIComponent("data science");
        const url = `https://api.duckduckgo.com/?q=${query}&format=json&no_html=1`;
        console.log(`Fetching: ${url}`);
        
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const data = await res.json();
        
        console.log("AbstractText:", data.AbstractText);
        console.log("AbstractSource:", data.AbstractSource);
        console.log("Heading:", data.Heading);
    } catch (e) {
        console.error("DDG Test Failed:", e.message);
    }
}

testDDG();
