import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Watchlist from '../models/Watchlist.js';
import PortfolioHolding from '../models/PortfolioHolding.js';
import * as twelveDataService from './yahooFinanceService.js';

let io = null;
const activeSymbols = new Map(); // Maps symbol -> Set of socketIds
let pollingTimer = null;

// Initialize token mapping stubs for backward schema compatibility
const tokenToSymbol = new Map();
for (const [symbol, details] of Object.entries(twelveDataService.TOKEN_MAPPING)) {
    tokenToSymbol.set(details.token, symbol.toUpperCase());
}

export const initSocketService = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', process.env.FRONTEND_URL, /\.vercel\.app$/].filter(Boolean),
            credentials: true
        }
    });

    // JWT Auth Middleware for sockets
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.query?.token;
            if (!token) {
                console.warn(`[SocketService] Auth failed: Token missing on socket ${socket.id}`);
                return next(new Error('Authentication error: Token required'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production');
            socket.user = decoded;
            next();
        } catch (err) {
            console.warn(`[SocketService] Auth failed: Invalid token on socket ${socket.id}`, err.message);
            return next(new Error('Authentication error: Token invalid'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`[SocketService] Client connected: SocketId=${socket.id}, UserId=${socket.user?.userId}`);

        // Listen for room subscriptions
        socket.on('subscribe', async (data) => {
            const { symbols } = data || {};
            if (Array.isArray(symbols)) {
                for (const sym of symbols) {
                    if (sym && typeof sym === 'string') {
                        await subscribeSocketToSymbol(socket, sym);
                    }
                }
            }
        });

        // Listen for room unsubscriptions
        socket.on('unsubscribe', async (data) => {
            const { symbols } = data || {};
            if (Array.isArray(symbols)) {
                for (const sym of symbols) {
                    if (sym && typeof sym === 'string') {
                        await unsubscribeSocketFromSymbol(socket, sym);
                    }
                }
            }
        });

        socket.on('disconnect', () => {
            handleSocketDisconnect(socket);
        });
    });

    return io;
};

/**
 * Twelve Data polling interval manager
 */
function startRealTimePolling() {
    if (pollingTimer) return;
    
    console.log('[SocketService] Starting Twelve Data real-time polling...');
    pollingTimer = setInterval(async () => {
        if (activeSymbols.size === 0) {
            stopRealTimePolling();
            return;
        }

        const symbolsToFetch = Array.from(activeSymbols.keys());
        try {
            console.log(`[SocketService] Polling live quotes for active symbols: ${symbolsToFetch.join(', ')}`);
            const quotes = await twelveDataService.getQuotes(symbolsToFetch);
            
            for (const [symbol, quote] of Object.entries(quotes)) {
                if (!quote || quote.currentPrice === null || quote.currentPrice === undefined) continue;
                
                // Broadcast priceUpdate to the room
                io.to(`symbol:${symbol}`).emit('priceUpdate', {
                    symbol,
                    price: quote.currentPrice,
                    change: Number(quote.change?.toFixed(2) || 0),
                    changePercent: Number(quote.changePercent?.toFixed(2) || 0),
                    high: quote.dayHigh,
                    low: quote.dayLow,
                    volume: quote.volume,
                    timestamp: new Date().getTime()
                });
            }
        } catch (err) {
            console.error('[SocketService] Polling interval fetch failed:', err.message);
        }
    }, 15000); // Poll every 15 seconds (utilizes 60-second caching, safe for rate limits)
}

function stopRealTimePolling() {
    if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
        console.log('[SocketService] Stopped Twelve Data real-time polling.');
    }
}

async function subscribeSocketToSymbol(socket, symbol) {
    const uppercaseSymbol = symbol.trim().toUpperCase();
    const roomName = `symbol:${uppercaseSymbol}`;

    socket.join(roomName);

    if (!activeSymbols.has(uppercaseSymbol)) {
        activeSymbols.set(uppercaseSymbol, new Set());
    }

    activeSymbols.get(uppercaseSymbol).add(socket.id);

    // If first subscriber, start polling loop
    if (activeSymbols.get(uppercaseSymbol).size === 1) {
        startRealTimePolling();
    }

    console.log(`[SocketService] Client ${socket.id} subscribed to ${uppercaseSymbol}. Watchers: ${activeSymbols.get(uppercaseSymbol)?.size || 0}`);
}

async function unsubscribeSocketFromSymbol(socket, symbol) {
    const uppercaseSymbol = symbol.trim().toUpperCase();
    const roomName = `symbol:${uppercaseSymbol}`;

    socket.leave(roomName);

    if (activeSymbols.has(uppercaseSymbol)) {
        const socketsSet = activeSymbols.get(uppercaseSymbol);
        socketsSet.delete(socket.id);
        console.log(`[SocketService] Client ${socket.id} unsubscribed from ${uppercaseSymbol}. Watchers left: ${socketsSet.size}`);

        if (socketsSet.size === 0) {
            activeSymbols.delete(uppercaseSymbol);
            if (activeSymbols.size === 0) {
                stopRealTimePolling();
            }
        }
    }
}

function handleSocketDisconnect(socket) {
    console.log(`[SocketService] Client disconnected: ${socket.id}`);

    for (const [symbol, socketsSet] of activeSymbols.entries()) {
        if (socketsSet.has(socket.id)) {
            socketsSet.delete(socket.id);
            console.log(`[SocketService] Cleaned subscriber ${socket.id} from ${symbol}. Watchers left: ${socketsSet.size}`);

            if (socketsSet.size === 0) {
                activeSymbols.delete(symbol);
            }
        }
    }

    if (activeSymbols.size === 0) {
        stopRealTimePolling();
    }
}
