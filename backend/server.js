import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { createServer } from 'http';

import authRoutes from './routes/authRoutes.js';
import incomeRoutes from './routes/incomeRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import savingsRoutes from './routes/savingsRoutes.js';
import investmentRoutes from './routes/investmentRoutes.js';
import loanRoutes from './routes/loanRoutes.js';
import insuranceRoutes from './routes/insuranceRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import taxSavingRoutes from './routes/taxSavingRoutes.js';
import chatbotRoutes from './routes/chatbotRoutes.js';
import familyRoutes from './routes/familyRoutes.js';
import familyBudgetRoutes from './routes/familyBudgetRoutes.js';
import familyTransactionRoutes from './routes/familyTransactionRoutes.js';
import familyGoalRoutes from './routes/familyGoalRoutes.js';
import familyGoalPlannerRoutes from './routes/familyGoalPlannerRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import stockRoutes from './routes/stockRoutes.js';
import watchlistRoutes from './routes/watchlistRoutes.js';
import marketRoutes from './routes/marketRoutes.js';
import portfolioRoutes from './routes/portfolioRoutes.js';
import familyPortfolioRoutes from './routes/familyPortfolioRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import statementRoutes from './routes/statementRoutes.js';
import debugRoutes from './routes/debugRoutes.js';
import welfareRoutes from './routes/welfareRoutes.js';
import { debugStockQuote } from './controllers/stockController.js';
import { debugStatementUpload } from './controllers/statementController.js';
import multer from 'multer';


dotenv.config(); // Reload watch trigger to update Twelve Data key

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_ATLAS_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/PersonalFinance';

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', process.env.FRONTEND_URL, /\.vercel\.app$/].filter(Boolean),
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Monitor Mongoose connection
mongoose.connection.on('error', err => {
    console.error('Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected. Attempting to reconnect...');
});

mongoose.connection.on('connected', () => {
    console.log('Mongoose connected successfully to', mongoose.connection.name);
});

// Database connection
const connectDB = async () => {
    try {
        if (mongoose.connection.readyState === 1) return;
        
        console.log('Connecting to MongoDB...');
        // Mask password in logs - using the same logic as successful test_db.mjs
        const maskedUri = MONGODB_URI.replace(/:([^:@]+)@/, ':****@');
        console.log(`Using URI: ${maskedUri}`);

        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            dbName: 'PersonalFinance',
            retryWrites: true,
            w: 'majority'
        });
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
    }
};

// Lazy DB connection - runs on each request but connectDB() guards against double-connects
// This is Vercel-safe: avoids top-level await blocking the module load
app.use(async (req, res, next) => {
    await connectDB();
    next();
});


// API Routes need to await DB connection? 
// Mongoose buffers automatically, but if it times out, it means connection failed.
// The buffering timeout suggests it couldn't connect at all.

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/expense', expenseRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/investment', investmentRoutes);
app.use('/api/loan', loanRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tax-saving', taxSavingRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/family/budgets', familyBudgetRoutes);
app.use('/api/family/transactions', familyTransactionRoutes);
app.use('/api/family/goals', familyGoalRoutes);
app.use('/api/family/goal-planner', familyGoalPlannerRoutes);
app.use('/api/family/chat', chatRoutes);
app.use('/api/stocks', stockRoutes);
app.get('/api/debug/stock/:symbol', debugStockQuote);

const serverUpload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });
app.post('/api/debug/statement', serverUpload.single('file'), debugStatementUpload);
app.use('/api/debug', debugRoutes);

app.use('/api/watchlist', watchlistRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/family/portfolio', familyPortfolioRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/statement', statementRoutes);
app.use('/api/welfare', welfareRoutes);

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.send('API is running');
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

// Export app for Vercel
export default app;

// Only listen if run directly (not on Vercel serverless)
// Wrapped in async IIFE for ESM compatibility
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    (async () => {
        // Only import socket service locally - it's incompatible with Vercel serverless
        const { initSocketService } = await import('./services/socketService.js');
        connectDB(); // Connect eagerly when running locally
        const httpServer = createServer(app);
        initSocketService(httpServer);
        httpServer.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    })();
}