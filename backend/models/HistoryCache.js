import mongoose from 'mongoose';

const historyCacheSchema = new mongoose.Schema({
    symbol: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    interval: {
        type: String,
        required: true,
        trim: true
    },
    outputsize: {
        type: Number,
        required: true
    },
    candles: [
        {
            timestamp: { type: Date, required: true },
            open: { type: Number, required: true },
            high: { type: Number, required: true },
            low: { type: Number, required: true },
            close: { type: Number, required: true },
            volume: { type: Number, default: 0 }
        }
    ],
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

// Compound index to ensure uniqueness per symbol, timeframe interval, and candle size
historyCacheSchema.index({ symbol: 1, interval: 1, outputsize: 1 }, { unique: true });

export default mongoose.model('HistoryCache', historyCacheSchema);
