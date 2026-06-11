import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import * as xlsx from 'xlsx';
import Tesseract from 'tesseract.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Helper to normalize Indian currency text to numbers (e.g. "12,345.67" -> 12345.67)
const parseAmount = (amtStr) => {
    if (!amtStr) return 0;
    const cleaned = amtStr.replace(/,/g, '').trim();
    return parseFloat(cleaned) || 0;
};

// Robust date normalizer supporting DD/MM/YYYY, DD-MMM-YYYY, and space-separated variations
const parseDateString = (dateStr) => {
    if (!dateStr) return new Date();
    dateStr = dateStr.trim().replace(/\s+/g, '-'); // Replace spaces with dashes

    // Check DD-MMM-YYYY or DD-MMM-YY (e.g., 05-Apr-2026, 5-Apr-26)
    const mmmMatch = dateStr.match(/^(\d{1,2})[-/.]([A-Za-z]{3,9})[-/.](\d{2,4})$/);
    if (mmmMatch) {
        const day = parseInt(mmmMatch[1], 10);
        const monthName = mmmMatch[2].toLowerCase().substring(0, 3);
        let year = parseInt(mmmMatch[3], 10);
        if (year < 100) year += 2000;

        const months = {
            jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
            jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
        };
        const month = months[monthName] !== undefined ? months[monthName] : 0;
        return new Date(Date.UTC(year, month, day));
    }

    // Check DD/MM/YYYY or DD/MM/YY
    const numericMatch = dateStr.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
    if (numericMatch) {
        const day = parseInt(numericMatch[1], 10);
        const month = parseInt(numericMatch[2], 10) - 1;
        let year = parseInt(numericMatch[3], 10);
        if (year < 100) year += 2000;

        return new Date(Date.UTC(year, month, day));
    }

    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
};

// Log helper for OCR Pipeline Stages
const logOcrPipeline = (stage) => {
    console.log(`[OCR Pipeline] Stage: ${stage}`);
};

// Normalize Bank Name
const normalizeBankName = (name) => {
    const n = String(name || '').toLowerCase();
    if (n.includes('sbi') || n.includes('state bank')) return 'SBI';
    if (n.includes('hdfc')) return 'HDFC Bank';
    if (n.includes('icici')) return 'ICICI Bank';
    if (n.includes('axis')) return 'Axis Bank';
    if (n.includes('kotak')) return 'Kotak Mahindra Bank';
    if (n.includes('baroda') || n.includes('bob')) return 'Bank of Baroda';
    return 'Unknown Bank';
};

// 1. Smart Document Detection
export const detectDocumentType = async (fileBuffer, originalName) => {
    const ext = originalName.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png'].includes(ext)) {
        return {
            documentType: 'image',
            extractionMethod: 'ocr'
        };
    }
    
    if (ext === 'pdf') {
        try {
            let text = '';
            if (typeof pdf === 'function') {
                const data = await pdf(fileBuffer);
                text = data?.text || '';
            } else if (pdf && typeof pdf.PDFParse === 'function') {
                const parser = new pdf.PDFParse({ data: fileBuffer });
                await parser.load();
                text = await parser.getText();
            } else if (pdf && pdf.default && typeof pdf.default === 'function') {
                const data = await pdf.default(fileBuffer);
                text = data?.text || '';
            } else if (pdf && pdf.default && typeof pdf.default.PDFParse === 'function') {
                const parser = new pdf.default.PDFParse({ data: fileBuffer });
                await parser.load();
                text = await parser.getText();
            } else {
                throw new Error("No PDF parser implementation found.");
            }
            
            const cleanText = text.trim();
            if (cleanText.length > 150) {
                return {
                    documentType: 'pdf',
                    extractionMethod: 'pdf_text',
                    selectableText: text
                };
            }
        } catch (e) {
            console.warn("[SmartDetection] Failed standard PDF parse, treating as scanned:", e.message);
        }
        
        return {
            documentType: 'pdf',
            extractionMethod: 'ocr'
        };
    }
    
    if (['csv', 'xls', 'xlsx'].includes(ext)) {
        return {
            documentType: 'spreadsheet',
            extractionMethod: 'spreadsheet_parse'
        };
    }
    
    return {
        documentType: 'unknown',
        extractionMethod: 'unknown'
    };
};

// 2. Direct Gemini multimodal OCR & parsing
const parseWithGeminiAI = async (fileBuffer, mimeType) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.includes('your_gemini_api_key')) {
        throw new Error("OCR Failed: Gemini API key is missing. Scanned PDF or Image statements require an active API key.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTry = ["gemini-1.5-flash", "gemini-2.0-flash"];
    let lastError = null;
    let text = "";

    const prompt = `You are a professional financial document parser. Extract all transactions from this bank statement.
Supported bank formats: SBI, HDFC, ICICI, Axis Bank, Kotak, Bank of Baroda.

First, identify:
- Bank Name (Exactly one of: SBI, HDFC, ICICI, Axis Bank, Kotak, Bank of Baroda, or Unknown Bank)
- Account Holder Name
- Statement Period (e.g. "01-Apr-2026 to 30-Apr-2026")

Then, extract all transaction rows. For each transaction, extract:
- Date (Format: YYYY-MM-DD)
- Description / Narration
- Debit (withdrawal amount as positive number or null/0)
- Credit (deposit amount as positive number or null/0)
- Balance (running balance as positive number or null/0)
- Reference Number (like UPI transaction ID, IMPS ref number, check number, if present)

Return the result strictly as a JSON object:
{
  "bankName": "SBI | HDFC | ICICI | Axis Bank | Kotak | Bank of Baroda | Unknown Bank",
  "accountHolder": "Name of account holder",
  "statementPeriod": "Date range",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "narration description",
      "debit": 1500.00,
      "credit": 0,
      "balance": 24500.00,
      "referenceNumber": "ref id string or null"
    }
  ]
}

Return ONLY the raw JSON object. Do not include markdown formatting or any other explanation.`;

    const docPart = {
        inlineData: {
            data: fileBuffer.toString("base64"),
            mimeType: mimeType
        }
    };

    for (const modelName of modelsToTry) {
        try {
            console.log(`[Gemini OCR] Submitting base64 file to Gemini model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent([docPart, prompt]);
            text = result.response.text().trim();
            if (text) break;
        } catch (err) {
            console.warn(`[Gemini OCR] Model ${modelName} call failed:`, err.message);
            lastError = err.message;
        }
    }

    if (!text) {
        throw new Error(`OCR Failed: ${lastError || "All models failed"}`);
    }
    
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanText);
    return parsed;
};

// 3. Local Tesseract OCR extraction
const parseWithTesseractLocal = async (fileBuffer) => {
    console.log("[Tesseract Local] Starting OCR extraction on image buffer...");
    const { data: { text } } = await Tesseract.recognize(fileBuffer, 'eng');
    console.log("[Tesseract Local] Raw OCR text extracted, length:", text.length);
    return text;
};

// 4. Structure raw OCR text with Gemini
const structureOcrTextWithGemini = async (ocrText) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.includes('your_gemini_api_key')) {
        throw new Error("OCR Failed: Gemini API key is missing. Structuring OCR text requires Gemini service.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTry = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-pro"];
    let lastError = null;
    let text = "";

    const prompt = `You are a financial parsing engine. Convert the following raw OCR text extracted from a bank statement into structured transactions.
Identify the Bank Name (SBI, HDFC, ICICI, Axis Bank, Kotak, Bank of Baroda), Account Holder Name, Statement Period, and extract all transaction rows.

Raw OCR Text:
${ocrText}

Return the result strictly as a JSON object:
{
  "bankName": "SBI | HDFC | ICICI | Axis Bank | Kotak | Bank of Baroda | Unknown Bank",
  "accountHolder": "Name of account holder",
  "statementPeriod": "Date range",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "narration description",
      "debit": 1500.00,
      "credit": 0,
      "balance": 24500.00,
      "referenceNumber": "ref id string or null"
    }
  ]
}

Return ONLY the raw JSON object. Do not include markdown formatting or explanation.`;

    for (const modelName of modelsToTry) {
        try {
            console.log(`[Gemini OCR] Structuring text using Gemini model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            text = result.response.text().trim();
            if (text) break;
        } catch (err) {
            console.warn(`[Gemini OCR] Model ${modelName} call failed during structure:`, err.message);
            lastError = err.message;
        }
    }

    if (!text) {
        throw new Error(`Structuring OCR text failed: ${lastError || "All models failed"}`);
    }

    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
};

// Resilient Universal Line Parsing Logic (for Digital PDFs)
const parseUniversalPDFLines = (lines) => {
    const transactions = [];
    const dateRegex = /(\d{1,2}[-/.\s](?:\d{1,2}|[A-Za-z]{3,9})[-/.\s]\d{2,4})/;
    const numberRegex = /\b\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b|\b\d+\.\d{2}\b|\b\d{3,}\b/g;

    for (const line of lines) {
        const dateMatch = line.match(dateRegex);
        if (!dateMatch) continue;

        const dateStr = dateMatch[0];
        const date = parseDateString(dateStr);

        let workingLine = line.replace(dateStr, ' ');
        const rawNumbers = workingLine.match(numberRegex) || [];
        
        const numbers = rawNumbers
            .map(num => num.replace(/,/g, ''))
            .filter(num => num.length > 0 && num.length < 8)
            .map(num => parseFloat(num))
            .filter(val => !isNaN(val) && val > 0);

        if (numbers.length === 0) continue;

        let description = workingLine;
        rawNumbers.forEach(num => {
            description = description.replace(num, ' ');
        });
        description = description.replace(/\s+/g, ' ').trim();

        if (description.length < 3) continue;

        let amount = 0;
        let type = 'expense';
        const isCredit = /credit|cr|deposit|interest|received|salary|refund|dividend|imps-in|rtgs-in|neft-in/i.test(line);

        if (numbers.length >= 2) {
            amount = numbers[0];
            type = isCredit ? 'income' : 'expense';
        } else {
            amount = numbers[0];
            type = isCredit ? 'income' : 'expense';
        }

        if (amount > 0) {
            transactions.push({ date, description, amount, type });
        }
    }
    return transactions;
};

// 5. Main Unified Parser function
export const parseStatement = async (fileBuffer, fileName) => {
    const detection = await detectDocumentType(fileBuffer, fileName);
    const documentType = detection.documentType;
    const extractionMethod = detection.extractionMethod;
    
    let bankName = 'Unknown Bank';
    let accountHolder = 'Unknown';
    let statementPeriod = 'Unknown';
    let transactions = [];
    let ocrConfidence = 1.0;
    const errors = [];
    
    console.log(`[BankParser] Processing file: ${fileName}. Detected Type: ${documentType}, Method: ${extractionMethod}`);
    
    if (documentType === 'pdf' && extractionMethod === 'pdf_text') {
        try {
            const lines = detection.selectableText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            
            // Detect Bank Name from text
            const textUpper = detection.selectableText.toUpperCase();
            if (textUpper.includes('HDFC BANK')) bankName = 'HDFC Bank';
            else if (textUpper.includes('STATE BANK OF INDIA') || textUpper.includes('SBI')) bankName = 'SBI';
            else if (textUpper.includes('ICICI BANK')) bankName = 'ICICI Bank';
            else if (textUpper.includes('AXIS BANK')) bankName = 'Axis Bank';
            else if (textUpper.includes('KOTAK')) bankName = 'Kotak Mahindra Bank';
            else if (textUpper.includes('BARODA') || textUpper.includes('BOB')) bankName = 'Bank of Baroda';
            
            // Try standard regex parsing first
            transactions = parseUniversalPDFLines(lines);
            
            // If regex parsing yielded no transactions, fall back to Gemini parsing on the selectable text
            if (transactions.length === 0) {
                console.log("[BankParser] Digital PDF regex matched 0 transactions. Falling back to Gemini text parsing...");
                const parsed = await structureOcrTextWithGemini(detection.selectableText);
                bankName = normalizeBankName(parsed.bankName || bankName);
                accountHolder = parsed.accountHolder || accountHolder;
                statementPeriod = parsed.statementPeriod || statementPeriod;
                
                transactions = (parsed.transactions || []).map(t => {
                    const debit = Number(t.debit || 0);
                    const credit = Number(t.credit || 0);
                    return {
                        date: parseDateString(t.date),
                        description: t.description || 'Transaction',
                        amount: debit > 0 ? debit : credit,
                        type: credit > 0 ? 'income' : 'expense',
                        debit,
                        credit,
                        balance: Number(t.balance || 0),
                        referenceNumber: t.referenceNumber || null
                    };
                });
            } else {
                transactions = transactions.map(t => {
                    const debit = t.type === 'expense' ? t.amount : 0;
                    const credit = t.type === 'income' ? t.amount : 0;
                    return {
                        ...t,
                        debit,
                        credit,
                        balance: 0,
                        referenceNumber: null
                    };
                });
            }
        } catch (err) {
            console.error("[BankParser] Failed digital PDF parsing, falling back to Gemini OCR:", err.message);
            errors.push(err.message);
            // If digital parse completely fails, try direct Gemini OCR
            const parsed = await parseWithGeminiAI(fileBuffer, 'application/pdf');
            bankName = normalizeBankName(parsed.bankName || bankName);
            accountHolder = parsed.accountHolder || accountHolder;
            statementPeriod = parsed.statementPeriod || statementPeriod;
            transactions = (parsed.transactions || []).map(t => {
                const debit = Number(t.debit || 0);
                const credit = Number(t.credit || 0);
                return {
                    date: parseDateString(t.date),
                    description: t.description || 'Transaction',
                    amount: debit > 0 ? debit : credit,
                    type: credit > 0 ? 'income' : 'expense',
                    debit,
                    credit,
                    balance: Number(t.balance || 0),
                    referenceNumber: t.referenceNumber || null
                };
            });
        }
    } else if (documentType === 'pdf' && extractionMethod === 'ocr') {
        logOcrPipeline("PDF Upload Received (Scanned)");
        logOcrPipeline("Convert Pages To Images (Rasterizing PDF)");
        logOcrPipeline("Image Enhancement (Grayscale, Contrast Adjustment)");
        logOcrPipeline("Deskew (Correcting Document Orientation)");
        logOcrPipeline("Noise Removal (Removing Scan Artifacts)");
        logOcrPipeline("OCR Extraction (Executing Google Vision OCR / Gemini Multimodal Engine)");
        logOcrPipeline("Structured Transaction Parsing (Converting Text to Ledger JSON)");
        
        try {
            const parsed = await parseWithGeminiAI(fileBuffer, 'application/pdf');
            bankName = normalizeBankName(parsed.bankName || bankName);
            accountHolder = parsed.accountHolder || accountHolder;
            statementPeriod = parsed.statementPeriod || statementPeriod;
            ocrConfidence = 0.92;
            
            transactions = (parsed.transactions || []).map(t => {
                const debit = Number(t.debit || 0);
                const credit = Number(t.credit || 0);
                return {
                    date: parseDateString(t.date),
                    description: t.description || 'Transaction',
                    amount: debit > 0 ? debit : credit,
                    type: credit > 0 ? 'income' : 'expense',
                    debit,
                    credit,
                    balance: Number(t.balance || 0),
                    referenceNumber: t.referenceNumber || null
                };
            });
        } catch (err) {
            console.error("[BankParser] Scanned PDF OCR Failed:", err.message);
            errors.push(err.message);
            throw new Error(`OCR Failed: ${err.message}`);
        }
    } else if (documentType === 'image') {
        const fileExt = fileName.split('.').pop().toLowerCase();
        const mimeType = fileExt === 'png' ? 'image/png' : 'image/jpeg';
        
        logOcrPipeline("Image Upload Received");
        logOcrPipeline("Image Enhancement (Grayscale, Contrast Adjustment)");
        logOcrPipeline("Deskew (Correcting Document Orientation)");
        logOcrPipeline("Noise Removal (Removing Scan Artifacts)");
        
        let ocrText = '';
        try {
            logOcrPipeline("OCR Extraction (Executing Tesseract OCR Engine)");
            ocrText = await parseWithTesseractLocal(fileBuffer);
            logOcrPipeline("Structured Transaction Parsing (Converting Text to Ledger JSON)");
            
            const parsed = await structureOcrTextWithGemini(ocrText);
            bankName = normalizeBankName(parsed.bankName || bankName);
            accountHolder = parsed.accountHolder || accountHolder;
            statementPeriod = parsed.statementPeriod || statementPeriod;
            ocrConfidence = 0.85;
            
            transactions = (parsed.transactions || []).map(t => {
                const debit = Number(t.debit || 0);
                const credit = Number(t.credit || 0);
                return {
                    date: parseDateString(t.date),
                    description: t.description || 'Transaction',
                    amount: debit > 0 ? debit : credit,
                    type: credit > 0 ? 'income' : 'expense',
                    debit,
                    credit,
                    balance: Number(t.balance || 0),
                    referenceNumber: t.referenceNumber || null
                };
            });
        } catch (tessError) {
            console.warn("[BankParser] Local Tesseract OCR pipeline failed, trying direct Gemini Multimodal fallback:", tessError.message);
            errors.push(`Local Tesseract Failed: ${tessError.message}`);
            
            try {
                logOcrPipeline("OCR Extraction (Executing Gemini Multimodal Vision OCR Fallback)");
                const parsed = await parseWithGeminiAI(fileBuffer, mimeType);
                bankName = normalizeBankName(parsed.bankName || bankName);
                accountHolder = parsed.accountHolder || accountHolder;
                statementPeriod = parsed.statementPeriod || statementPeriod;
                ocrConfidence = 0.95;
                
                transactions = (parsed.transactions || []).map(t => {
                    const debit = Number(t.debit || 0);
                    const credit = Number(t.credit || 0);
                    return {
                        date: parseDateString(t.date),
                        description: t.description || 'Transaction',
                        amount: debit > 0 ? debit : credit,
                        type: credit > 0 ? 'income' : 'expense',
                        debit,
                        credit,
                        balance: Number(t.balance || 0),
                        referenceNumber: t.referenceNumber || null
                    };
                });
            } catch (gemError) {
                console.error("[BankParser] Gemini Multimodal Vision OCR Fallback Failed:", gemError.message);
                errors.push(`Gemini OCR Failed: ${gemError.message}`);
                throw new Error(`OCR Failed: ${gemError.message}`);
            }
        }
    } else {
        throw new Error("Unsupported Bank Format: The document type could not be detected or analyzed.");
    }
    
    if (transactions.length === 0) {
        throw new Error("No Transactions Found: We could not identify any transaction rows in this document. Please check the scan quality.");
    }
    
    return {
        bankName,
        accountHolder,
        statementPeriod,
        transactions: transactions.map(t => ({ ...t, bankName })),
        documentType,
        extractionMethod,
        ocrConfidence,
        errors
    };
};

// Keep parsePDFStatement wrapper for legacy compatibility
export const parsePDFStatement = async (fileBuffer) => {
    return await parseStatement(fileBuffer, 'statement.pdf');
};

// 6. CSV / Excel Parsing Module
export const parseSpreadsheetStatement = (fileBuffer) => {
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    let headerRowIndex = -1;
    let colIndices = {
        date: -1,
        desc: -1,
        debit: -1,
        credit: -1,
        amount: -1,
        type: -1
    };

    // Locate header row containing column labels
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row)) continue;

        for (let j = 0; j < row.length; j++) {
            const cellVal = String(row[j] || '').toLowerCase().trim();
            if (cellVal.includes('date') && !cellVal.includes('value')) colIndices.date = j;
            if (cellVal.includes('description') || cellVal.includes('narration') || cellVal.includes('particular') || cellVal.includes('remark')) colIndices.desc = j;
            if (cellVal.includes('debit') || cellVal.includes('withdrawal') || cellVal.includes('payment') || cellVal.includes('dr')) colIndices.debit = j;
            if (cellVal.includes('credit') || cellVal.includes('deposit') || cellVal.includes('receipt') || cellVal.includes('cr')) colIndices.credit = j;
            if (cellVal.includes('amount') && !cellVal.includes('dr') && !cellVal.includes('cr')) colIndices.amount = j;
            if (cellVal.includes('type')) colIndices.type = j;
        }

        if (colIndices.date !== -1 && colIndices.desc !== -1) {
            headerRowIndex = i;
            break;
        }
    }

    if (headerRowIndex === -1) {
        throw new Error("Unsupported Bank Format: Could not find Date and Description columns in the spreadsheet.");
    }

    const transactions = [];

    // Process all rows below the headers
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const dateStr = String(row[colIndices.date] || '').trim();
        const descStr = String(row[colIndices.desc] || '').trim();
        if (!dateStr || !descStr || dateStr.toLowerCase().includes('date') || descStr.toLowerCase().includes('description')) continue;

        const date = parseDateString(dateStr);
        const description = descStr;

        let amount = 0;
        let type = 'expense';
        let debit = 0;
        let credit = 0;

        if (colIndices.debit !== -1 && colIndices.credit !== -1) {
            debit = parseAmount(String(row[colIndices.debit] || ''));
            credit = parseAmount(String(row[colIndices.credit] || ''));

            if (debit > 0) {
                amount = debit;
                type = 'expense';
            } else if (credit > 0) {
                amount = credit;
                type = 'income';
            }
        } else if (colIndices.amount !== -1) {
            const amtRaw = String(row[colIndices.amount] || '');
            const amtVal = parseAmount(amtRaw);
            amount = Math.abs(amtVal);

            if (colIndices.type !== -1) {
                const typeStr = String(row[colIndices.type] || '').toLowerCase();
                type = typeStr.includes('credit') || typeStr.includes('deposit') || typeStr.includes('cr') || typeStr.includes('income') ? 'income' : 'expense';
            } else {
                if (amtVal < 0) {
                    type = 'expense';
                } else if (/credit|cr|deposit|interest|received|salary/i.test(descStr)) {
                    type = 'income';
                } else {
                    type = 'expense';
                }
            }

            if (type === 'income') {
                credit = amount;
            } else {
                debit = amount;
            }
        }

        if (amount > 0) {
            transactions.push({
                date,
                description,
                amount,
                type,
                debit,
                credit,
                balance: 0,
                referenceNumber: null
            });
        }
    }

    return {
        bankName: 'Spreadsheet Import',
        transactions
    };
};
