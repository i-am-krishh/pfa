import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import incomeRoutes from './routes/incomeRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import savingsRoutes from './routes/savingsRoutes.js';
import investmentRoutes from './routes/investmentRoutes.js';
import loanRoutes from './routes/loanRoutes.js';
import insuranceRoutes from './routes/insuranceRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import taxSavingRoutes from './routes/taxSavingRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/PersonalFinance';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('MongoDB connected successfully');
    })
    .catch((error) => {
        console.log('MongoDB connection error:', error);
        process.exit(1);
    });

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

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ 
        success: true, 
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
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

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});