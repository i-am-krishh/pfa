import mongoose from 'mongoose';

const portfolioHoldingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Please provide user ID']
    },
    familyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FamilyGroup',
        default: null
    },
    stockSymbol: {
        type: String,
        required: [true, 'Please provide stock symbol'],
        trim: true,
        uppercase: true
    },
    symbol: {
        type: String,
        trim: true,
        uppercase: true
    },
    token: {
        type: String,
        trim: true
    },
    exchange: {
        type: String,
        default: 'NSE',
        trim: true
    },
    stockName: {
        type: String,
        required: [true, 'Please provide stock/asset name'],
        trim: true
    },
    quantity: {
        type: Number,
        required: [true, 'Please provide quantity'],
        min: [0, 'Quantity cannot be negative']
    },
    buyPrice: {
        type: Number,
        required: [true, 'Please provide buy price'],
        min: [0, 'Buy price cannot be negative']
    },
    purchaseDate: {
        type: Date,
        required: [true, 'Please provide purchase date'],
        default: Date.now
    },
    notes: {
        type: String,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field on save and sync symbol and stockSymbol
portfolioHoldingSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    
    if (this.symbol && !this.stockSymbol) {
        this.stockSymbol = this.symbol;
    } else if (this.stockSymbol && !this.symbol) {
        this.symbol = this.stockSymbol;
    }
    
    next();
});

// Indexes for query performance
portfolioHoldingSchema.index({ userId: 1 });
portfolioHoldingSchema.index({ familyId: 1 });

export default mongoose.model('PortfolioHolding', portfolioHoldingSchema);

