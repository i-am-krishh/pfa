import mongoose from 'mongoose';

const watchlistSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Please provide user ID']
    },
    symbol: {
        type: String,
        required: [true, 'Please provide symbol'],
        trim: true,
        uppercase: true
    },
    companyName: {
        type: String,
        required: [true, 'Please provide company name'],
        trim: true
    },
    market: {
        type: String,
        trim: true
    },
    exchange: {
        type: String,
        default: 'NSE',
        trim: true
    },
    token: {
        type: String,
        trim: true
    },
    addedAt: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Keep market and exchange synced, and addedAt and createdAt synced
watchlistSchema.pre('save', function(next) {
    if (this.exchange && !this.market) {
        this.market = this.exchange;
    } else if (this.market && !this.exchange) {
        this.exchange = this.market;
    }
    
    if (this.createdAt && !this.addedAt) {
        this.addedAt = this.createdAt;
    } else if (this.addedAt && !this.createdAt) {
        this.createdAt = this.addedAt;
    }
    
    next();
});

// Ensure a user can only add a symbol to their watchlist once
watchlistSchema.index({ userId: 1, symbol: 1 }, { unique: true });

export default mongoose.model('Watchlist', watchlistSchema);

