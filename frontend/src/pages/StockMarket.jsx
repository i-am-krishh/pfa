import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  TrendingUp, Activity, Search, Star, Trash2, Plus, 
  ArrowUpRight, ArrowDownRight, BarChart2, DollarSign, 
  Volume2, Compass, AlertCircle, RefreshCw, Landmark, Sparkles, BookOpen, Scale, HelpCircle
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { useSocket } from '../context/SocketContext';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function StockMarket() {
  const [activeRange, setActiveRange] = useState('1M');
  const [watchlist, setWatchlist] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  // Default selected stock to RELIANCE for Indian Market focus
  const [selectedStock, setSelectedStock] = useState('RELIANCE');
  const [selectedStockName, setSelectedStockName] = useState('Reliance Industries Limited');
  const [selectedStockMarket, setSelectedStockMarket] = useState('NSE');
  
  const [quote, setQuote] = useState(null);
  const [history, setHistory] = useState([]);
  const [technicals, setTechnicals] = useState(null);
  const [marketOverview, setMarketOverview] = useState([]);
  
  // AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Loading states
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [error, setError] = useState(null);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Helper to get auth token
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const { subscribe, unsubscribe, socket, connected } = useSocket();

  // Format Helper for Indian Rupees (INR)
  const formatINR = (val, dec = 2) => {
    if (val === undefined || val === null) return 'Data Unavailable';
    return '₹' + Number(val).toLocaleString('en-IN', {
      maximumFractionDigits: dec,
      minimumFractionDigits: dec
    });
  };

  // Format Large Values (e.g. Market Cap) in Lakhs/Crores
  const formatCrores = (val) => {
    if (val === undefined || val === null) return 'Data Unavailable';
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    }
    return formatINR(val, 0);
  };

  // Format Stock metrics dynamically handling statuses
  const formatMetric = (val, status, formatFn) => {
    if (loadingDetails) return 'Loading...';
    if (val !== undefined && val !== null) {
      return formatFn ? formatFn(val) : val;
    }
    return status || 'Field Not Provided By API';
  };

  // Fetch Market Indices Overview (NIFTY, SENSEX, BANKNIFTY...)
  const fetchMarketOverview = async () => {
    try {
      const res = await axios.get(`${API_URL}/market/overview`, { headers: getAuthHeader() });
      if (res.data.success) {
        setMarketOverview(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching market overview:', err);
    } finally {
      setLoadingOverview(false);
    }
  };

  // Fetch Watchlist
  const fetchWatchlist = useCallback(async () => {
    setWatchlistLoading(true);
    try {
      const res = await axios.get(`${API_URL}/watchlist`, { headers: getAuthHeader() });
      if (res.data.success) {
        setWatchlist(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching watchlist:', err);
    } finally {
      setWatchlistLoading(false);
    }
  }, []);

  // Fetch Stock details (Quote, History, Technical Indicators)
  const fetchStockDetails = useCallback(async (symbol) => {
    setLoadingDetails(true);
    setError(null);
    setAiAnalysis(null); // Clear previous AI analysis
    setQuote({
      currentPrice: null,
      currentPriceStatus: 'Loading...',
      marketCap: null,
      marketCapStatus: 'Loading...',
      peRatio: null,
      peRatioStatus: 'Loading...',
      volume: null,
      volumeStatus: 'Loading...',
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekHighStatus: 'Loading...',
      fiftyTwoWeekLow: null,
      fiftyTwoWeekLowStatus: 'Loading...'
    });
    setHistory([]);

    let quoteFetched = false;
    let quoteData = null;

    // 1. Fetch Quote
    try {
      const quoteRes = await axios.get(`${API_URL}/stocks/quote/${symbol}`, { headers: getAuthHeader() });
      if (quoteRes.data.success) {
        quoteData = quoteRes.data.data;
        console.log(`[Frontend UI Value] Received quote for ${symbol} via API:`, JSON.stringify(quoteData));
        setQuote(quoteData);
        quoteFetched = true;
      }
    } catch (err) {
      console.error('Error fetching stock quote:', err);
      const is404 = err.response?.status === 404;
      const serverMsg = err.response?.data?.message;
      let statusMsg = is404 ? 'Symbol Not Found' : 'API Error';
      if (serverMsg) {
        if (serverMsg.includes('Authentication Failed') || serverMsg.includes('auth')) {
          statusMsg = 'API Error';
        } else if (serverMsg.includes('Token Expired')) {
          statusMsg = 'API Error';
        } else if (serverMsg.includes('Symbol Not Found')) {
          statusMsg = 'Symbol Not Found';
        } else if (serverMsg.includes('Rate limit') || serverMsg.includes('429')) {
          statusMsg = 'API Error';
        }
      }
      setError(statusMsg);
      if (symbol === 'TATASTEEL') {
        console.log(`[TATASTEEL debug] Final frontend error value:`, statusMsg);
      }
      setQuote({
        currentPrice: null,
        currentPriceStatus: statusMsg,
        marketCap: null,
        marketCapStatus: statusMsg,
        peRatio: null,
        peRatioStatus: statusMsg,
        volume: null,
        volumeStatus: statusMsg,
        fiftyTwoWeekHigh: null,
        fiftyTwoWeekHighStatus: statusMsg,
        fiftyTwoWeekLow: null,
        fiftyTwoWeekLowStatus: statusMsg
      });
    }

    // 2. Fetch Technicals
    try {
      const techRes = await axios.get(`${API_URL}/stocks/technical/${symbol}`, { headers: getAuthHeader() });
      if (techRes.data.success) {
        setTechnicals(techRes.data.data);
      }
    } catch (techErr) {
      console.warn('Technicals API failed:', techErr.message);
      setTechnicals({ rsi: null, sma: null });
    }

    // 3. Fetch History
    try {
      const histRes = await axios.get(`${API_URL}/stocks/history/${symbol}?range=${activeRange}&interval=D`, { headers: getAuthHeader() });
      if (histRes.data.success && histRes.data.data.length > 0) {
        setHistory(histRes.data.data);
      }
    } catch (histErr) {
      console.warn('History API failed:', histErr.message);
      setHistory([]);
    }

    setLoadingDetails(false);
  }, [activeRange]);

  // Request AI Analysis
  const triggerAIAnalysis = async () => {
    setLoadingAI(true);
    setAiError(null);
    try {
      // Get current user portfolio holdings to pass to AI
      let portfolioHoldings = [];
      try {
        const portRes = await axios.get(`${API_URL}/portfolio`, { headers: getAuthHeader() });
        if (portRes.data.success) {
          portfolioHoldings = portRes.data.holdings;
        }
      } catch (e) {}

      // Get family goals to pass to AI
      let familyGoals = [];
      try {
        const groupsRes = await axios.get(`${API_URL}/family`, { headers: getAuthHeader() });
        if (groupsRes.data.success && groupsRes.data.groups.length > 0) {
          const mainGroupId = groupsRes.data.groups[0]._id;
          const plannerRes = await axios.get(`${API_URL}/family/goals`, { headers: getAuthHeader() }); // check goals
          familyGoals = plannerRes.data.goals || [];
        }
      } catch (e) {}

      const res = await axios.post(`${API_URL}/market/ai-analysis`, {
        stockSymbol: selectedStock,
        userPortfolio: portfolioHoldings,
        familyGoals,
        riskProfile: 'medium'
      }, { headers: getAuthHeader() });

      if (res.data.success) {
        setAiAnalysis(res.data.analysis);
      }
    } catch (err) {
      console.error('AI Analysis failed:', err);
      setAiError(err.response?.data?.error || err.response?.data?.message || 'Error generating AI analysis.');
    } finally {
      setLoadingAI(false);
    }
  };

  // Search stock symbol debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await axios.get(`${API_URL}/stocks/search?q=${searchQuery}`, { headers: getAuthHeader() });
        if (res.data.success) {
          setSearchResults(res.data.results);
        }
      } catch (err) {
        console.error('Error searching stocks:', err);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Subscribe/Unsubscribe Socket.io symbols
  useEffect(() => {
    const symbols = [selectedStock, ...watchlist.map(item => item.symbol)].filter(Boolean);
    subscribe(symbols);

    return () => {
      unsubscribe(symbols);
    };
  }, [selectedStock, watchlist.map(item => item.symbol).join(','), subscribe, unsubscribe]);

  // Handle live socket price updates
  useEffect(() => {
    if (!socket) return;

    const handlePriceUpdate = (data) => {
      const { symbol, price, change, changePercent, high, low, volume } = data;

      // Update selected stock quote
      if (symbol.toUpperCase() === selectedStock.toUpperCase()) {
        console.log(`[Frontend UI Value] Received live WebSocket price update for ${symbol}: price=${price}, changePercent=${changePercent}`);
        if (symbol.toUpperCase() === 'TATASTEEL') {
          console.log(`[TATASTEEL debug] Final frontend live value: price=${price}, changePercent=${changePercent}`);
        }
        setQuote(prevQuote => {
          if (!prevQuote) return prevQuote;
          return {
            ...prevQuote,
            currentPrice: price,
            dayHigh: high,
            dayLow: low,
            volume,
            changePercent,
            change
          };
        });
        // Update technical indicators SMA slightly to move with price
        setTechnicals(prevTech => {
          if (!prevTech) return prevTech;
          return {
            ...prevTech,
            sma: Number((prevTech.sma * 0.98 + price * 0.02).toFixed(2))
          };
        });

        // Live update the last candle
        setHistory(prevHistory => {
          if (!prevHistory || prevHistory.length === 0) return prevHistory;
          const newHistory = [...prevHistory];
          const lastCandle = { ...newHistory[newHistory.length - 1] };
          const todayStr = new Date().toISOString().split('T')[0];

          if (lastCandle.time === todayStr) {
            lastCandle.close = price;
            if (price > lastCandle.high) lastCandle.high = price;
            if (price < lastCandle.low) lastCandle.low = price;
            lastCandle.volume = volume;
            newHistory[newHistory.length - 1] = lastCandle;
          }
          return newHistory;
        });
      }

      // Update watchlist items
      setWatchlist(prevWatchlist => {
        return prevWatchlist.map(item => {
          if (item.symbol.toUpperCase() === symbol.toUpperCase()) {
            return {
              ...item,
              currentPrice: price,
              change,
              changePercent
            };
          }
          return item;
        });
      });

      // Update index card quotes in real-time
      setMarketOverview(prevOverview => {
        return prevOverview.map(item => {
          if (item.symbol.toUpperCase() === symbol.toUpperCase()) {
            return {
              ...item,
              currentValue: price,
              change,
              percentageChange: changePercent
            };
          }
          return item;
        });
      });
    };

    socket.on('priceUpdate', handlePriceUpdate);

    return () => {
      socket.off('priceUpdate', handlePriceUpdate);
    };
  }, [socket, selectedStock]);

  // Initial loads and polling fallbacks
  useEffect(() => {
    fetchMarketOverview();
    fetchWatchlist();
    const interval = setInterval(() => {
      fetchMarketOverview();
      if (!connected) {
        fetchWatchlist();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchWatchlist, connected]);

  useEffect(() => {
    fetchStockDetails(selectedStock);
  }, [selectedStock, activeRange, fetchStockDetails]);

  // Add stock to watchlist
  const handleAddToWatchlist = async () => {
    setActionLoading(true);
    try {
      await axios.post(`${API_URL}/watchlist/add`, {
        symbol: selectedStock,
        companyName: selectedStockName,
        market: selectedStockMarket
      }, { headers: getAuthHeader() });
      
      fetchWatchlist();
    } catch (err) {
      console.error('Error adding stock to watchlist:', err);
      alert(err.response?.data?.message || 'Failed to add stock to watchlist');
    } finally {
      setActionLoading(false);
    }
  };

  // Remove stock from watchlist
  const handleRemoveFromWatchlist = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Remove from watchlist?')) return;
    
    try {
      await axios.delete(`${API_URL}/watchlist/${id}`, { headers: getAuthHeader() });
      fetchWatchlist();
    } catch (err) {
      console.error('Error removing from watchlist:', err);
    }
  };

  const isWatchlisted = watchlist.some(item => item.symbol === selectedStock);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10 px-4">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/10">
              <TrendingUp size={28} />
            </div>
            Indian Stock Intelligence
          </h1>
          <p className="text-slate-500 mt-2 text-base font-medium">NSE/BSE analytics, interactive technical indicators, and AI-powered market intelligence.</p>
        </div>

        {/* Live status banner */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-extrabold text-emerald-700">
          <Activity size={14} className="animate-pulse" />
          <span>LIVE INDIAN STOCK DATA CONNECTED</span>
        </div>
      </div>

      {/* STEP 2: Indian Market Indices overview cards */}
      {loadingOverview ? (
        <div className="flex gap-4 overflow-x-auto py-2">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="bg-slate-100 animate-pulse w-48 h-24 rounded-2xl flex-shrink-0" />
          ))}
        </div>
      ) : (
        <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-thin">
          {marketOverview.map((item) => {
            const isUp = item.percentageChange >= 0;
            return (
              <div 
                key={item.symbol}
                onClick={() => {
                  setSelectedStock(item.symbol);
                  setSelectedStockName(item.name);
                  setSelectedStockMarket('INDEX');
                }}
                className={`bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm min-w-[195px] flex-shrink-0 cursor-pointer hover:border-indigo-200 hover:shadow-md transition-all active:scale-98
                  ${selectedStock === item.symbol ? 'ring-2 ring-indigo-500 border-transparent' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-extrabold text-slate-800 text-sm tracking-tight">{item.name}</span>
                  <span className={`inline-flex items-center text-[10px] font-black px-1.5 py-0.5 rounded-lg
                    ${isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {isUp ? '+' : ''}{item.percentageChange?.toFixed(2)}%
                  </span>
                </div>
                <h4 className="text-lg font-black text-slate-950 mt-2">{formatINR(item.currentValue, 2).replace('₹', '')}</h4>
                <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-bold">
                  <span>H: {formatINR(item.dayHigh, 0).replace('₹', '')}</span>
                  <span>L: {formatINR(item.dayLow, 0).replace('₹', '')}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Content Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column - Search, Quote details, Charts */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Symbol Lookup */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm relative">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Lookup NSE Tickers</h3>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search Indian Stocks (e.g. RELIANCE, TCS, HDFCBANK, Tata)..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-slate-800"
              />
              {searching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <RefreshCw className="animate-spin text-indigo-500" size={18} />
                </div>
              )}
            </div>

            {/* Float dropdown lookup list */}
            {searchResults.length > 0 && (
              <div className="absolute left-5 right-5 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-slate-100">
                {searchResults.map((item) => (
                  <div 
                    key={item.symbol}
                    onClick={() => {
                      setSelectedStock(item.symbol);
                      setSelectedStockName(item.companyName);
                      setSelectedStockMarket(item.exchange);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="flex justify-between items-center px-4 py-3.5 hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                  >
                    <div>
                      <div className="font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">{item.symbol}</div>
                      <div className="text-xs text-slate-500 font-bold mt-0.5">{item.companyName}</div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase">{item.exchange}</span>
                      <div className="text-[10px] text-slate-400 mt-1 capitalize font-semibold">{item.sector}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quote details, Indicators & Charts Card */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            {loadingDetails ? (
              <div className="flex flex-col items-center justify-center flex-grow p-12 text-slate-400">
                <RefreshCw className="animate-spin text-indigo-500 mb-3" size={32} />
                <p className="font-semibold text-slate-600">Syncing live market feeds...</p>
              </div>
            ) : (
              <>
                {/* Header detail */}
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-black text-slate-950">{selectedStock}</h2>
                      <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-black rounded-lg uppercase">{selectedStockMarket}</span>
                    </div>
                    <p className="text-slate-500 text-xs font-extrabold mt-1 uppercase tracking-wider">{selectedStockName}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={triggerAIAnalysis}
                      disabled={loadingAI}
                      className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 font-bold px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:opacity-90 transition-all text-sm active:scale-95 shadow-md shadow-indigo-600/10"
                    >
                      <Sparkles size={16} className={loadingAI ? 'animate-spin' : ''} />
                      AI Analysis
                    </button>
                    
                    <button
                      onClick={handleAddToWatchlist}
                      disabled={isWatchlisted || actionLoading}
                      className={`flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 font-bold px-4 py-2 rounded-xl transition-all active:scale-95 text-sm shadow-sm
                        ${isWatchlisted 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 cursor-default' 
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                    >
                      <Star size={16} className="text-amber-500" fill={isWatchlisted ? 'currentColor' : 'none'} />
                      {isWatchlisted ? 'Watchlisted' : 'Watch Ticker'}
                    </button>
                  </div>
                </div>

                {/* Key Ratio Metrics Cards */}
                <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-6 border-b border-slate-100 bg-white">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Price</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-slate-950">
                        {formatMetric(quote?.currentPrice, quote?.currentPriceStatus, formatINR)}
                      </span>
                      {quote?.changePercent !== undefined && quote?.changePercent !== null && (
                        <span className={`inline-flex items-center text-xs font-black gap-0.5
                          ${quote.changePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {quote.changePercent >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          {Math.abs(quote.changePercent).toFixed(2)}%
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Market Cap</span>
                    <div className="text-lg font-black text-slate-800 flex items-center gap-1.5">
                      <Landmark size={16} className="text-slate-400" />
                      {formatMetric(quote?.marketCap, quote?.marketCapStatus, formatCrores)}
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">P/E Ratio</span>
                    <div className="text-lg font-black text-slate-800 flex items-center gap-1.5">
                      <Scale size={16} className="text-slate-400" />
                      {formatMetric(quote?.peRatio, quote?.peRatioStatus)}
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">24h Volume</span>
                    <div className="text-lg font-black text-slate-800 flex items-center gap-1.5">
                      <Volume2 size={16} className="text-slate-400" />
                      {formatMetric(quote?.volume, quote?.volumeStatus, (v) => v.toLocaleString())}
                    </div>
                  </div>
                </div>

                {/* Technical Indicators Sub-panel */}
                {technicals && (
                  <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-6 text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-1.5">
                      RSI (14): 
                      {technicals.rsi !== null && technicals.rsi !== undefined ? (
                        <span className={`px-2 py-0.5 rounded-lg
                          ${technicals.rsi >= 70 ? 'bg-rose-100 text-rose-800' : technicals.rsi <= 30 ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-50 text-indigo-700'}`}>
                          {technicals.rsi?.toFixed(1)} ({(technicals.rsi >= 70 ? 'Overbought' : technicals.rsi <= 30 ? 'Oversold' : 'Neutral')})
                        </span>
                      ) : (
                        <span className="text-slate-400">Indicator unavailable</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1.5">
                      20 SMA: 
                      {technicals.sma !== null && technicals.sma !== undefined ? (
                        <span className="text-slate-800">{formatINR(technicals.sma)}</span>
                      ) : (
                        <span className="text-slate-400">Indicator unavailable</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1.5">
                      52W Range: 
                      <span className="text-slate-800">
                        {formatMetric(
                          quote?.fiftyTwoWeekLow,
                          quote?.fiftyTwoWeekLowStatus,
                          (low) => `${formatINR(low, 0)} - ${formatINR(quote?.fiftyTwoWeekHigh, 0)}`
                        )}
                      </span>
                    </span>
                  </div>
                )}

                {/* Chart Segment */}
                <div className="p-6 flex-grow flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Historical Trend</span>
                    <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                      {['1D', '1W', '1M', '6M', '1Y', '5Y'].map((range) => (
                        <button
                          key={range}
                          onClick={() => setActiveRange(range)}
                          className={`px-3 py-1 text-xs font-black rounded-lg transition-all
                            ${activeRange === range 
                              ? 'bg-white text-indigo-600 shadow-sm' 
                              : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Area Chart */}
                  <div className="w-full h-64 flex-grow">
                    {history.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-400">
                        <AlertCircle size={20} className="mr-1.5" /> No historical data available.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={history} margin={{ top: 10, right: 5, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.01}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} />
                          <YAxis 
                            stroke="#94a3b8" 
                            fontSize={10} 
                            tickLine={false}
                            domain={['auto', 'auto']}
                            tickFormatter={(v) => `₹${v}`}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                            labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                            formatter={(value) => [formatINR(value), 'Price']}
                          />
                          <Area type="monotone" dataKey="close" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#chartGradient)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* AI Analysis panel */}
          {aiAnalysis && (
            <div className="bg-gradient-to-br from-indigo-900/90 to-slate-900 text-white rounded-2xl border border-indigo-500/20 p-6 shadow-xl relative overflow-hidden animate-in slide-in-from-bottom duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles size={110} className="text-indigo-400 animate-pulse" />
              </div>
              
              <div className="flex items-center gap-2.5 mb-4">
                <Sparkles size={20} className="text-amber-400" />
                <h3 className="text-lg font-black tracking-tight">AI Stock Research Report</h3>
              </div>

              <div className="space-y-5 text-slate-200 text-sm">
                <div>
                  <h4 className="text-xs font-black uppercase text-indigo-400 tracking-wider mb-1">Stock Overview</h4>
                  <p className="leading-relaxed font-semibold">{aiAnalysis.stockSummary}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-indigo-950/40 p-4 rounded-xl border border-indigo-800/20">
                    <h4 className="text-xs font-black uppercase text-emerald-400 tracking-wider mb-2 flex items-center gap-1">
                      <TrendingUp size={12} /> Key Strengths
                    </h4>
                    <ul className="list-disc list-inside space-y-1 font-semibold text-slate-300 text-xs">
                      {aiAnalysis.strengths?.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-indigo-950/40 p-4 rounded-xl border border-indigo-800/20">
                    <h4 className="text-xs font-black uppercase text-rose-400 tracking-wider mb-2 flex items-center gap-1">
                      <AlertCircle size={12} /> Investment Risks
                    </h4>
                    <ul className="list-disc list-inside space-y-1 font-semibold text-slate-300 text-xs">
                      {aiAnalysis.risks?.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="border-t border-indigo-800/30 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-black uppercase text-indigo-400 tracking-wider mb-1">Diversification Impact</h4>
                    <p className="leading-relaxed font-semibold text-xs">{aiAnalysis.diversificationAdvice}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-indigo-400 tracking-wider mb-1">Long-term Suitability</h4>
                    <p className="leading-relaxed font-semibold text-xs">{aiAnalysis.longTermSuitability}</p>
                  </div>
                </div>

                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/50">
                  <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider mb-1">Portfolio Deployment Advice</h4>
                  <p className="font-extrabold text-xs">{aiAnalysis.portfolioImpact}</p>
                </div>

                <div className="text-[10px] text-slate-500 italic mt-4 leading-relaxed pt-2 border-t border-indigo-800/20">
                  {aiAnalysis.financialDisclaimer}
                </div>
              </div>
            </div>
          )}

          {aiError && (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-start gap-3 text-rose-800 text-sm">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">AI Analysis Failed</span>
                <span className="font-medium text-xs text-rose-600">{aiError}</span>
              </div>
            </div>
          )}

        </div>

        {/* Right column - Watchlist */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Star className="text-amber-500 fill-amber-500" size={18} />
                My Watchlist
              </h2>
              <button 
                onClick={fetchWatchlist}
                className="text-slate-400 hover:text-indigo-600 p-1.5 hover:bg-slate-100 rounded-full transition-all"
                title="Refresh Prices"
              >
                <RefreshCw size={16} className={watchlistLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto divide-y divide-slate-100 max-h-[550px]">
              {watchlistLoading && watchlist.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <RefreshCw className="animate-spin text-indigo-500 mx-auto mb-2" size={24} />
                  <span className="text-sm font-medium">Refreshing list...</span>
                </div>
              ) : watchlist.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400 h-full">
                  <Star size={44} className="mb-3 opacity-25 text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-700">Watchlist is empty</h3>
                  <p className="max-w-[200px] mx-auto text-xs mt-1 leading-relaxed font-semibold">Search Indian stocks and watch them to stream live rates here.</p>
                </div>
              ) : (
                watchlist.map((item) => {
                  const isUp = (item.changePercent || 0) >= 0;
                  return (
                    <div 
                      key={item._id}
                      onClick={() => {
                        setSelectedStock(item.symbol);
                        setSelectedStockName(item.companyName);
                        setSelectedStockMarket(item.market);
                      }}
                      className={`p-4 flex justify-between items-center cursor-pointer transition-all hover:bg-indigo-50/40 group
                        ${selectedStock === item.symbol ? 'bg-indigo-50/50 border-l-4 border-indigo-600 pl-3' : ''}`}
                    >
                      <div className="flex-grow min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-sm truncate">{item.symbol}</span>
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black rounded uppercase tracking-wider">{item.market}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5 font-bold">{item.companyName}</div>
                      </div>
                      
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <div className="font-black text-slate-900 text-sm">
                            {formatINR(item.currentPrice)}
                          </div>
                          <div className="flex items-center gap-1 justify-end mt-0.5">
                            {item.change !== undefined && item.change !== null && (
                              <span className={`text-[10px] font-extrabold ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {isUp ? '+' : ''}{item.change.toFixed(2)}
                              </span>
                            )}
                            {item.changePercent !== undefined && item.changePercent !== null && (
                              <span className={`inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-lg
                                ${isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                {Math.abs(item.changePercent).toFixed(2)}%
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={(e) => handleRemoveFromWatchlist(item._id, e)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Remove from Watchlist"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
