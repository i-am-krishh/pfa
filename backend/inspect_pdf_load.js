import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

async function testLoad() {
    try {
        console.log("Creating PDFParse instance...");
        const parser = new pdf.PDFParse({ data: Buffer.from([]) });
        console.log("Calling load...");
        // This might fail for empty buffer, but let's see how it behaves or what error it throws
        await parser.load();
        console.log("Calling getText...");
        const text = await parser.getText();
        console.log("Text:", text);
    } catch (e) {
        console.log("Error during load/getText:", e.message);
    }
}

testLoad();
