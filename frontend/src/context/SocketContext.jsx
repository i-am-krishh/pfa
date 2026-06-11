import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const subscribedSymbolsRef = useRef(new Set());
    const socketRef = useRef(null);

    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const SOCKET_URL = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;

    // Connect to Socket.io server
    const connectSocket = () => {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('[SocketContext] No token found in localStorage, skipping connection.');
            setConnected(false);
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setSocket(null);
            }
            return;
        }

        // If socket is already connected and token matches, do not reconnect
        if (socketRef.current?.connected) {
            return;
        }

        if (socketRef.current) {
            socketRef.current.disconnect();
        }

        console.log(`[SocketContext] Connecting socket to ${SOCKET_URL}...`);
        
        try {
            const socketInstance = io(SOCKET_URL, {
                auth: { token },
                transports: ['websocket', 'polling'], // websocket-first with polling fallback
                reconnectionAttempts: 15,
                reconnectionDelay: 3000,
                autoConnect: true
            });

            socketInstance.on('connect', () => {
                console.log('[SocketContext] Connected to Socket.io server. ID:', socketInstance.id);
                setConnected(true);
                
                // Re-subscribe to all symbols we were tracking before reconnection
                if (subscribedSymbolsRef.current.size > 0) {
                    const symbols = Array.from(subscribedSymbolsRef.current);
                    console.log('[SocketContext] Re-subscribing on connection:', symbols);
                    socketInstance.emit('subscribe', { symbols });
                }
            });

            socketInstance.on('disconnect', (reason) => {
                console.log('[SocketContext] Disconnected from server:', reason);
                setConnected(false);
            });

            socketInstance.on('connect_error', (err) => {
                console.warn('[SocketContext] Connection attempt failed:', err.message);
                setConnected(false);
            });

            socketRef.current = socketInstance;
            setSocket(socketInstance);
        } catch (error) {
            console.error('[SocketContext] Error creating socket instance:', error);
            setConnected(false);
        }
    };

    // Subscribe to symbol updates
    const subscribe = (symbols) => {
        if (!symbols || !Array.isArray(symbols) || symbols.length === 0) return;
        const newSymbols = symbols.map(s => s.trim().toUpperCase()).filter(Boolean);
        
        newSymbols.forEach(sym => subscribedSymbolsRef.current.add(sym));

        if (socketRef.current && socketRef.current.connected) {
            console.log('[SocketContext] Subscribing to symbols:', newSymbols);
            socketRef.current.emit('subscribe', { symbols: newSymbols });
        }
    };

    // Unsubscribe from symbol updates
    const unsubscribe = (symbols) => {
        if (!symbols || !Array.isArray(symbols) || symbols.length === 0) return;
        const removeSymbols = symbols.map(s => s.trim().toUpperCase()).filter(Boolean);

        removeSymbols.forEach(sym => subscribedSymbolsRef.current.delete(sym));

        if (socketRef.current && socketRef.current.connected) {
            console.log('[SocketContext] Unsubscribing from symbols:', removeSymbols);
            socketRef.current.emit('unsubscribe', { symbols: removeSymbols });
        }
    };

    // Connect immediately on startup
    useEffect(() => {
        connectSocket();

        // Listen for storage changes (to re-initialize connection if token changes)
        const handleAuthChange = () => {
            connectSocket();
        };

        // Simple custom event trigger for login updates
        window.addEventListener('auth-change', handleAuthChange);
        window.addEventListener('storage', handleAuthChange);

        return () => {
            window.removeEventListener('auth-change', handleAuthChange);
            window.removeEventListener('storage', handleAuthChange);
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    const value = {
        socket,
        connected,
        subscribe,
        unsubscribe,
        reconnect: connectSocket
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};
