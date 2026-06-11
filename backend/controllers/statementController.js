import StatementUpload from '../models/StatementUpload.js';
import TransactionRecord from '../models/TransactionRecord.js';
import Income from '../models/Income.js';
import Expense from '../models/Expense.js';
import FamilyGroup from '../models/FamilyGroup.js';
import { parsePDFStatement, parseSpreadsheetStatement, parseStatement } from '../services/bankParser.js';
import { classifyAIBatch } from '../services/categorizationService.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mongoose from 'mongoose';

// Map income source to schema enum
const INCOME_SOURCES = ['salary', 'freelance', 'investment', 'bonus', 'gift', 'other'];
const getMappedIncomeSource = (sourceStr) => {
    const src = String(sourceStr || '').toLowerCase().trim();
    if (INCOME_SOURCES.includes(src)) return src;
    if (src.includes('salary')) return 'salary';
    if (src.includes('dividend') || src.includes('interest') || src.includes('investment')) return 'investment';
    if (src.includes('bonus')) return 'bonus';
    if (src.includes('gift')) return 'gift';
    return 'other';
};

// 1. Upload & Process Statement (Staging)
// 1. Upload & Process Statement (Staging)
export const uploadStatement = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload a bank statement file' });
        }

        const userId = req.user.userId;
        const fileBuffer = req.file.buffer;
        const fileName = req.file.originalname;
        const fileType = fileName.split('.').pop().toLowerCase();

        console.log(`[StatementController] Parsing statement upload: ${fileName} (${req.file.size} bytes)`);

        let parseRes;
        if (['csv', 'xls', 'xlsx'].includes(fileType)) {
            parseRes = parseSpreadsheetStatement(fileBuffer);
        } else if (['pdf', 'jpg', 'jpeg', 'png'].includes(fileType)) {
            parseRes = await parseStatement(fileBuffer, fileName);
        } else {
            return res.status(400).json({ success: false, message: 'Unsupported Bank Format: Please upload PDF, CSV, Excel, or Image (JPG/PNG)' });
        }

        const {
            bankName,
            accountHolder,
            statementPeriod,
            transactions,
            documentType,
            extractionMethod,
            ocrConfidence,
            errors
        } = parseRes;
        
        if (!transactions || transactions.length === 0) {
            return res.status(400).json({ success: false, message: 'No Transactions Found: We could not find any transaction rows in this statement.' });
        }

        // Run Categorization (Rule-based + AI Batch)
        const categorizedTxns = await classifyAIBatch(transactions);

        // Fetch user's family group (if any approved member)
        const familyGroup = await FamilyGroup.findOne({
            'members.user': userId,
            'members.status': 'Approved'
        });

        // Initialize StatementUpload entry
        const statementUpload = new StatementUpload({
            userId,
            familyId: familyGroup?._id || null,
            fileName,
            fileType,
            processingStatus: 'parsed',
            totalTransactions: transactions.length,
            extractedTransactions: transactions.length,
            documentType: documentType || (['csv', 'xls', 'xlsx'].includes(fileType) ? 'spreadsheet' : 'pdf'),
            extractionMethod: extractionMethod || (['csv', 'xls', 'xlsx'].includes(fileType) ? 'spreadsheet_parse' : 'pdf_text'),
            bankDetected: bankName || 'Unknown Bank',
            ocrConfidence: ocrConfidence !== undefined ? ocrConfidence : 1.0,
            errors: errors || []
        });
        await statementUpload.save();

        const stagingRecords = [];

        // Run Duplicate Detection & Save to Staging Table
        for (const txn of categorizedTxns) {
            const startOfDay = new Date(txn.date);
            startOfDay.setUTCHours(0,0,0,0);
            
            const endOfDay = new Date(txn.date);
            endOfDay.setUTCHours(23,59,59,999);

            let duplicateExists = false;
            
            // 1. Check by Reference Number if available
            if (txn.referenceNumber) {
                const dupInstaging = await TransactionRecord.exists({
                    userId,
                    imported: true,
                    $or: [
                        { description: new RegExp(txn.referenceNumber, 'i') }
                    ]
                });
                
                const dupInIncome = await Income.exists({
                    userId,
                    $or: [
                        { description: new RegExp(txn.referenceNumber, 'i') }
                    ]
                });
                
                const dupInExpense = await Expense.exists({
                    userId,
                    $or: [
                        { description: new RegExp(txn.referenceNumber, 'i') }
                    ]
                });
                
                if (dupInstaging || dupInIncome || dupInExpense) {
                    duplicateExists = true;
                }
            }
            
            // 2. Fallback to Date, Amount, Description check
            if (!duplicateExists) {
                const descRegex = new RegExp(txn.description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
                const stageDup = await TransactionRecord.exists({
                    userId,
                    amount: txn.amount,
                    date: { $gte: startOfDay, $lte: endOfDay },
                    description: descRegex,
                    imported: true
                });
                
                let ledgerDup = false;
                if (txn.type === 'income') {
                    ledgerDup = await Income.exists({
                        userId,
                        amount: txn.amount,
                        date: { $gte: startOfDay, $lte: endOfDay },
                        description: descRegex
                    });
                } else {
                    ledgerDup = await Expense.exists({
                        userId,
                        amount: txn.amount,
                        date: { $gte: startOfDay, $lte: endOfDay },
                        description: descRegex
                    });
                }
                
                if (stageDup || ledgerDup) {
                    duplicateExists = true;
                }
            }

            const stagingRecord = new TransactionRecord({
                userId,
                familyId: familyGroup?._id || null,
                statementUploadId: statementUpload._id,
                date: txn.date,
                description: txn.description,
                amount: txn.amount,
                type: txn.type,
                category: txn.category || 'Other',
                bankName: bankName || 'Unknown Bank',
                isDuplicate: !!duplicateExists,
                aiConfidence: txn.confidence || 0.5,
                imported: false
            });
            await stagingRecord.save();
            stagingRecords.push(stagingRecord);
        }

        // Calculate Spending Analytics Summary
        let totalIncome = 0;
        let totalExpense = 0;
        const categorySpending = {};
        const expenseList = [];
        
        categorizedTxns.forEach(t => {
            const amt = Number(t.amount || 0);
            if (t.type === 'income') {
                totalIncome += amt;
            } else {
                totalExpense += amt;
                categorySpending[t.category] = (categorySpending[t.category] || 0) + amt;
                expenseList.push(t);
            }
        });
        
        const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;
        
        const topCategories = Object.keys(categorySpending)
            .map(cat => ({ category: cat, amount: categorySpending[cat] }))
            .sort((a, b) => b.amount - a.amount);
            
        const largestExpenses = expenseList
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5)
            .map(e => ({ date: e.date, description: e.description, amount: e.amount, category: e.category }));
            
        const descGroup = {};
        expenseList.forEach(e => {
            const key = e.description.replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().substring(0, 15);
            if (!descGroup[key]) descGroup[key] = [];
            descGroup[key].push(e);
        });
        
        const recurringPayments = [];
        Object.keys(descGroup).forEach(k => {
            const list = descGroup[k];
            if (list.length >= 2) {
                const avg = list.reduce((sum, x) => sum + x.amount, 0) / list.length;
                recurringPayments.push({
                    description: list[0].description,
                    amount: Math.round(avg),
                    category: list[0].category
                });
            }
        });
        
        const analytics = {
            monthlySpending: totalExpense,
            savingsRate,
            topCategories,
            largestExpenses,
            recurringPayments
        };

        res.status(201).json({
            success: true,
            message: 'Statement parsed and staged successfully for review',
            upload: statementUpload,
            transactions: stagingRecords,
            analytics
        });

    } catch (error) {
        console.error('[StatementController] Upload Statement Failed:', error);
        
        let status = 400;
        let errMsg = error.message || 'Error processing statement upload';
        
        if (
            errMsg.includes("Unsupported Bank Format") ||
            errMsg.includes("scanned document") ||
            errMsg.includes("Scanned PDF Detected") ||
            errMsg.includes("OCR Failed") ||
            errMsg.includes("Low Quality Scan") ||
            errMsg.includes("No Transactions Found")
        ) {
            status = 400;
        } else {
            status = 500;
        }
        
        res.status(status).json({
            success: false,
            message: errMsg
        });
    }
};

// 2. Fetch Staging Transactions for Preview
export const getTransactionPreview = async (req, res) => {
    try {
        const { uploadId } = req.params;
        const userId = req.user.userId;

        const transactions = await TransactionRecord.find({
            statementUploadId: uploadId,
            userId
        }).sort({ date: 1 });

        res.status(200).json({
            success: true,
            transactions
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Error fetching transaction preview' });
    }
};

// 3. Confirm & Commit Staged Transactions to Ledger
export const confirmImport = async (req, res) => {
    try {
        const { uploadId } = req.params;
        const { selectedTransactionIds } = req.body;
        const userId = req.user.userId;

        if (!selectedTransactionIds || selectedTransactionIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No transactions selected for import' });
        }

        const upload = await StatementUpload.findOne({ _id: uploadId, userId });
        if (!upload) {
            return res.status(404).json({ success: false, message: 'Upload record not found' });
        }

        const stagingTxns = await TransactionRecord.find({
            _id: { $in: selectedTransactionIds },
            statementUploadId: uploadId,
            userId,
            imported: false
        });

        if (stagingTxns.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid pending transactions found to import' });
        }

        // Fetch user's family configuration
        const familyGroup = await FamilyGroup.findOne({
            'members.user': userId,
            'members.status': 'Approved'
        });

        // Determine if member is approved to sync
        const memberInfo = familyGroup?.members.find(m => m.user.toString() === userId.toString());
        const hasFamilySync = familyGroup && memberInfo && memberInfo.status === 'Approved';

        const incomesToInsert = [];
        const expensesToInsert = [];

        for (const txn of stagingTxns) {
            const familySyncConfig = hasFamilySync ? {
                enabled: true,
                familyId: familyGroup._id,
                visibility: 'family'
            } : { enabled: false };

            if (txn.type === 'income') {
                incomesToInsert.push({
                    userId,
                    familyGroupId: hasFamilySync && memberInfo.shareIncome ? familyGroup._id : null,
                    amount: txn.amount,
                    source: getMappedIncomeSource(txn.description),
                    category: txn.category || 'Other',
                    date: txn.date,
                    description: `[Imported] ${txn.description}`,
                    familySync: hasFamilySync && memberInfo.shareIncome ? familySyncConfig : { enabled: false }
                });
            } else {
                expensesToInsert.push({
                    userId,
                    familyGroupId: hasFamilySync && memberInfo.shareExpenses ? familyGroup._id : null,
                    amount: txn.amount,
                    category: txn.category || 'Other',
                    description: `[Imported] ${txn.description}`,
                    date: txn.date,
                    paymentMethod: 'bank_transfer',
                    status: 'approved',
                    familySync: hasFamilySync && memberInfo.shareExpenses ? familySyncConfig : { enabled: false }
                });
            }
        }

        // Insert into actual ledgers (direct saving bypasses the insufficient balance check)
        if (incomesToInsert.length > 0) {
            await Income.insertMany(incomesToInsert);
        }
        if (expensesToInsert.length > 0) {
            await Expense.insertMany(expensesToInsert);
        }

        // Mark as imported in staging table
        await TransactionRecord.updateMany(
            { _id: { $in: selectedTransactionIds } },
            { $set: { imported: true } }
        );

        upload.processingStatus = 'imported';
        await upload.save();

        res.status(200).json({
            success: true,
            message: `Successfully imported ${stagingTxns.length} transactions (Incomes: ${incomesToInsert.length}, Expenses: ${expensesToInsert.length})`
        });

    } catch (error) {
        console.error('[StatementController] Confirm Import Failed:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error executing transaction import'
        });
    }
};

// 4. Update Staging Category before confirmation
export const updateStagingCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { category, type } = req.body;
        const userId = req.user.userId;

        const record = await TransactionRecord.findOne({ _id: id, userId });
        if (!record) {
            return res.status(404).json({ success: false, message: 'Transaction record not found' });
        }

        if (category) record.category = category;
        if (type) record.type = type;

        await record.save();

        res.status(200).json({
            success: true,
            message: 'Transaction updated successfully',
            record
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Error updating staging record' });
    }
};

// 5. Get Upload History
export const getUploadHistory = async (req, res) => {
    try {
        const userId = req.user.userId;
        const history = await StatementUpload.find({ userId }).sort({ uploadDate: -1 });

        res.status(200).json({
            success: true,
            history
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Error fetching upload history' });
    }
};

// 6. Generate AI spending and family insights
export const getAIInsights = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Fetch imported transaction records
        const records = await TransactionRecord.find({ userId, imported: true }).sort({ date: -1 });

        if (records.length === 0) {
            return res.status(200).json({
                success: true,
                insights: [
                    "No imported transactions found. Upload your bank statement to unlock AI spending insights and charts."
                ],
                recurringPayments: []
            });
        }

        // 1. Calculate top spending categories
        const categoryMap = {};
        let totalIncome = 0;
        let totalExpense = 0;

        records.forEach(r => {
            if (r.type === 'expense') {
                categoryMap[r.category] = (categoryMap[r.category] || 0) + r.amount;
                totalExpense += r.amount;
            } else {
                totalIncome += r.amount;
            }
        });

        const sortedCategories = Object.keys(categoryMap)
            .map(cat => ({ name: cat, value: categoryMap[cat] }))
            .sort((a, b) => b.value - a.value);

        // 2. Identify Recurring Payments
        const descriptionMap = {};
        records.forEach(r => {
            if (r.type === 'expense') {
                const cleanDesc = r.description.replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().substring(0, 15);
                if (!descriptionMap[cleanDesc]) {
                    descriptionMap[cleanDesc] = [];
                }
                descriptionMap[cleanDesc].push(r);
            }
        });

        const recurringPayments = [];
        Object.keys(descriptionMap).forEach(key => {
            const txns = descriptionMap[key];
            if (txns.length >= 2) {
                // Check if they occur in different months
                const months = new Set(txns.map(t => new Date(t.date).getMonth()));
                if (months.size >= 2) {
                    const avgAmount = txns.reduce((sum, t) => sum + t.amount, 0) / txns.length;
                    recurringPayments.push({
                        description: txns[0].description,
                        averageAmount: Math.round(avgAmount),
                        frequency: 'Monthly',
                        category: txns[0].category
                    });
                }
            }
        });

        // 3. Generate AI text insights (Gemini AI or fallback)
        let insightsText = [];
        const API_KEY = process.env.GEMINI_API_KEY;

        if (API_KEY && API_KEY !== 'your_gemini_api_key') {
            try {
                const genAI = new GoogleGenerativeAI(API_KEY);
                const modelsToTry = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-pro"];
                let text = "";
                let lastError = null;

                const summaryData = {
                    totalIncome,
                    totalExpense,
                    topCategories: sortedCategories.slice(0, 3),
                    recurring: recurringPayments.slice(0, 3)
                };

                const prompt = `You are a personal financial advisor AI.
Analyze this user's bank statement summary:
${JSON.stringify(summaryData, null, 2)}

Generate 4-5 bulleted, action-oriented financial advice points (max 2 sentences each). Focus on:
- Top spending areas and where savings can be made.
- Analysis of subscription leaks or recurring EMIs.
- High-level cost-cutting recommendations.

Format your output as a raw JSON array of strings:
[
  "Insight sentence 1",
  "Insight sentence 2"
]
Do not include any Markdown syntax or explanation.`;

                for (const modelName of modelsToTry) {
                    try {
                        console.log(`[StatementController Insights] Querying Gemini using model: ${modelName}`);
                        const model = genAI.getGenerativeModel({ model: modelName });
                        const result = await model.generateContent(prompt);
                        text = result.response.text().trim();
                        if (text) break;
                    } catch (err) {
                        console.warn(`[StatementController Insights] Model ${modelName} call failed:`, err.message);
                        lastError = err.message;
                    }
                }

                if (!text) {
                    throw new Error(lastError || "All models failed");
                }

                const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
                insightsText = JSON.parse(cleanText);
            } catch (err) {
                console.error("[StatementController] Gemini insights prompt failed. Falling back.", err.message);
            }
        }

        // Fallback rule-based insights
        if (insightsText.length === 0) {
            insightsText.push(`Your highest spending category is "${sortedCategories[0]?.name || 'Other'}" with ₹${(sortedCategories[0]?.value || 0).toLocaleString()} spent.`);
            insightsText.push(`Incomes totaled ₹${totalIncome.toLocaleString()} while expenses totaled ₹${totalExpense.toLocaleString()}, resulting in a net savings rate of ${totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0}%.`);
            if (recurringPayments.length > 0) {
                insightsText.push(`Detected ${recurringPayments.length} recurring monthly transactions (e.g. ${recurringPayments[0].description}). Check if these subscriptions are active.`);
            }
            insightsText.push("Try placing 20% of your salary directly into investments or fixed deposits at the start of the month to foster wealth accumulation.");
        }

        res.status(200).json({
            success: true,
            insights: insightsText,
            recurringPayments
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Error generating insights' });
    }
};

// 7. Export Standardized CSV
export const exportStatementCSV = async (req, res) => {
    try {
        const { uploadId } = req.params;
        const userId = req.user.userId;

        const transactions = await TransactionRecord.find({
            statementUploadId: uploadId,
            userId
        }).sort({ date: 1 });

        if (transactions.length === 0) {
            return res.status(404).json({ success: false, message: 'No transactions found for this upload' });
        }

        // CSV Headers: Date, Description, Debit, Credit, Balance, Category
        let csvContent = 'Date,Description,Debit,Credit,Balance,Category\n';
        
        transactions.forEach(t => {
            const dateStr = new Date(t.date).toISOString().split('T')[0];
            const cleanDesc = `"${String(t.description || '').replace(/"/g, '""')}"`;
            const debit = t.type === 'expense' ? t.amount : 0;
            const credit = t.type === 'income' ? t.amount : 0;
            const balance = 0; // Balance is not fully tracked inline
            const category = t.category || 'Other';
            
            csvContent += `${dateStr},${cleanDesc},${debit},${credit},${balance},${category}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=statement_${uploadId}.csv`);
        return res.status(200).send(csvContent);
    } catch (error) {
        console.error('[StatementController] CSV Export Failed:', error);
        res.status(500).json({ success: false, message: error.message || 'Error exporting CSV' });
    }
};

// 8. Debug Statement Upload (No database commit)
export const debugStatementUpload = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload a bank statement file' });
        }

        const fileBuffer = req.file.buffer;
        const fileName = req.file.originalname;
        const fileType = fileName.split('.').pop().toLowerCase();

        console.log(`[StatementController - DEBUG] Processing debug upload: ${fileName}`);

        let parseRes;
        if (['csv', 'xls', 'xlsx'].includes(fileType)) {
            parseRes = parseSpreadsheetStatement(fileBuffer);
        } else if (['pdf', 'jpg', 'jpeg', 'png'].includes(fileType)) {
            parseRes = await parseStatement(fileBuffer, fileName);
        } else {
            return res.status(400).json({ success: false, message: 'Unsupported Bank Format: Please upload PDF, CSV, Excel, or Image (JPG/PNG)' });
        }

        const {
            bankName,
            accountHolder,
            statementPeriod,
            transactions,
            documentType,
            extractionMethod,
            ocrConfidence,
            errors
        } = parseRes;

        res.status(200).json({
            success: true,
            documentType: documentType || (['csv', 'xls', 'xlsx'].includes(fileType) ? 'spreadsheet' : 'pdf'),
            extractionMethod: extractionMethod || (['csv', 'xls', 'xlsx'].includes(fileType) ? 'spreadsheet_parse' : 'pdf_text'),
            bankDetected: bankName || 'Unknown Bank',
            transactionsFound: transactions ? transactions.length : 0,
            ocrConfidence: ocrConfidence !== undefined ? ocrConfidence : 1.0,
            errors: errors || [],
            transactions: transactions || []
        });

    } catch (error) {
        console.error('[StatementController - DEBUG] Debug statement failed:', error);
        
        let status = 400;
        let errMsg = error.message || 'Error during statement debug';
        
        if (
            errMsg.includes("Unsupported Bank Format") ||
            errMsg.includes("scanned document") ||
            errMsg.includes("Scanned PDF Detected") ||
            errMsg.includes("OCR Failed") ||
            errMsg.includes("Low Quality Scan") ||
            errMsg.includes("No Transactions Found")
        ) {
            status = 400;
        } else {
            status = 500;
        }
        
        res.status(status).json({
            success: false,
            message: errMsg,
            errors: [errMsg]
        });
    }
};
