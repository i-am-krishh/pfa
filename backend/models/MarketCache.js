import mongoose from 'mongoose';

const marketCacheSchema = new mongoose.Schema({
    symbol: {
        type: String,
        required: [true, 'Please provide symbol'],
        trim: true,
        uppercase: true,
        unique: true
    },
    currentPrice: {
        type: Number,
        required: [true, 'Please provide current price'],
        min: [0, 'Current price cannot be negative']
    },
    dayHigh: {
        type: Number,
        min: [0, 'Day high cannot be negative']
    },
    dayLow: {
        type: Number,
        min: [0, 'Day low cannot be negative']
    },
    volume: {
        type: Number,
        min: [0, 'Volume cannot be negative']
    },
    change: {
        type: Number
    },
    changePercent: {
        type: Number
    },
    marketCap: {
        type: Number
    },
    peRatio: {
        type: Number
    },
    fiftyTwoWeekHigh: {
        type: Number
    },
    fiftyTwoWeekLow: {
        type: Number
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('MarketCache', marketCacheSchema);
