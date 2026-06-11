import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  TrendingUp, TrendingDown, Plus, Minus, Search, Trash2, 
  RefreshCw, DollarSign, Wallet, Activity, ArrowUpRight, 
  ArrowDownRight, Star, Coins, AlertCircle, Info, PieChart as PieIcon,
  ChevronRight, Landmark, ArrowUp, ArrowDown, Sparkles
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { useSocket } from '../context/SocketContext';
import Modal from '../components/Modal';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function PortfolioTracker() {
  const [holdings, setHoldings] = useState([]);
  const [summary, setSummary] = useState({
    totalInvested: 0,
    totalCurrentValue: 0,
    totalProfitLoss: 0,
    totalProfitPercent: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Transaction Modals
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  
  // Search in Buy Modal
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  const [buyFormData, setBuyFormData] = useState({
    stockSymbol: '',
    stockName: '',
    quantity: '',
    buyPrice: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  
  const [sellFormData, setSellFormData] = useState({
    stockSymbol: '',
    stockName: '',
    quantity: '',
    maxQuantity: 0
  });

  const [formError, setFormError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  const token = localStorage.getItem('token');
  const getAuthHeader = () => token ? { Authorization: `Bearer ${token}` } : {};
  const { subscribe, unsubscribe, socket, connected } = useSocket();

  // Helper to format currency in INR (₹)
  const formatINR = (val) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    });
  };

  // Fetch portfolio holdings
  const fetchPortfolio = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}/portfolio`, { headers: getAuthHeader() });
      if (res.data.success) {
        setHoldings(res.data.holdings);
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Error fetching portfolio:', err);
      setError(err.response?.data?.message || 'Failed to load stock portfolio holdings.');
    } finally {
      setLoading(false);
    }
  };

  // Re-calculate summary client-side on live price changes
  const recalculateSummary = (updatedHoldings) => {
    let totalInv = 0;
    let totalVal = 0;
    
    updatedHoldings.forEach(item => {
      totalInv += item.investedAmount;
      totalVal += item.currentValue;
    });

    const totalPL = Number((totalVal - totalInv).toFixed(2));
    const totalPLPercent = totalInv > 0 ? Number(((totalPL / totalInv) * 100).toFixed(2)) : 0;

    setSummary({
      totalInvested: totalInv,
      totalCurrentValue: totalVal,
      totalProfitLoss: totalPL,
      totalProfitPercent: totalPLPercent
    });
  };

  // Subscribe to socket rooms for all portfolio tickers
  useEffect(() => {
    if (holdings.length === 0) return;
    const symbols = holdings.map(item => item.stockSymbol.toUpperCase());
    subscribe(symbols);
    
    return () => {
      unsubscribe(symbols);
    };
  }, [holdings.map(h => h.stockSymbol).join(','), subscribe, unsubscribe]);

  // Handle price update pushed from websocket
  useEffect(() => {
    if (!socket) return;
    
    const handlePriceUpdate = (data) => {
      const { symbol, price, change, changePercent } = data;
      const ticker = symbol.toUpperCase();
      
      setHoldings(prevHoldings => {
        let changed = false;
        const updated = prevHoldings.map(item => {
          if (item.stockSymbol.toUpperCase() === ticker) {
            changed = true;
            const currentValue = Number((item.quantity * price).toFixed(2));
            const profitLoss = Number((currentValue - item.investedAmount).toFixed(2));
            const profitPercentage = item.investedAmount > 0 ? Number(((profitLoss / item.investedAmount) * 100).toFixed(2)) : 0;
            return {
              ...item,
              currentPrice: price,
              currentValue,
              profitLoss,
              profitPercentage,
              change,
              changePercent
            };
          }
          return item;
        });

        if (changed) {
          recalculateSummary(updated);
        }
        return updated;
      });
    };

    socket.on('priceUpdate', handlePriceUpdate);
    
    return () => {
      socket.off('priceUpdate', handlePriceUpdate);
    };
  }, [socket]);

  // Initial load
  useEffect(() => {
    fetchPortfolio();
  }, []);

  // Search stock debounced for Buy Modal
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

  // Handle selecting search result in Buy Modal
  const handleSelectStock = async (stock) => {
    setSearching(true);
    setBuyFormData(prev => ({
      ...prev,
      stockSymbol: stock.symbol,
      stockName: stock.companyName
    }));
    setSearchQuery('');
    setSearchResults([]);

    // Fetch latest quote to auto-populate buy price
    try {
      const res = await axios.get(`${API_URL}/stocks/quote/${stock.symbol}`, { headers: getAuthHeader() });
      if (res.data.success) {
        setBuyFormData(prev => ({
          ...prev,
          buyPrice: res.data.data.currentPrice || ''
        }));
      }
    } catch (err) {
      console.warn('Failed to fetch stock quote:', err);
    } finally {
      setSearching(false);
    }
  };

  // Handle Buy transaction submission
  const handleBuySubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setActionLoading(true);
    try {
      const res = await axios.post(`${API_URL}/portfolio/buy`, buyFormData, { headers: getAuthHeader() });
      if (res.data.success) {
        await fetchPortfolio();
        setShowBuyModal(false);
        setBuyFormData({
          stockSymbol: '',
          stockName: '',
          quantity: '',
          buyPrice: '',
          purchaseDate: new Date().toISOString().split('T')[0],
          notes: ''
        });
      }
    } catch (err) {
      console.error('Buy stock error:', err);
      setFormError(err.response?.data?.message || 'Error processing buy transaction.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Sell Modal with stock details
  const openSellModal = (holding) => {
    setSellFormData({
      stockSymbol: holding.stockSymbol,
      stockName: holding.stockName,
      quantity: '',
      maxQuantity: holding.quantity
    });
    setFormError('');
    setShowSellModal(true);
  };

  // Handle Sell transaction submission
  const handleSellSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setActionLoading(true);
    
    if (Number(sellFormData.quantity) > sellFormData.maxQuantity) {
      setFormError(`Cannot sell more than owned quantity (${sellFormData.maxQuantity} shares)`);
      setActionLoading(false);
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/portfolio/sell`, {
        stockSymbol: sellFormData.stockSymbol,
        quantity: sellFormData.quantity
      }, { headers: getAuthHeader() });
      
      if (res.data.success) {
        await fetchPortfolio();
        setShowSellModal(false);
      }
    } catch (err) {
      console.error('Sell stock error:', err);
      setFormError(err.response?.data?.message || 'Error processing sell transaction.');
    } finally {
      setActionLoading(false);
    }
  };

  // Colors for charts
  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#14b8a6', '#64748b'];

  // Allocation data for Recharts
  const allocationData = holdings.map(item => ({
    name: item.stockSymbol,
    value: item.currentValue
  })).filter(h => h.value > 0);

  const profitLossTotal = summary.totalProfitLoss;
  const isProfitable = profitLossTotal >= 0;

  if (loading && holdings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
        <RefreshCw className="animate-spin text-blue-600 mb-4" size={40} />
        <h2 className="text-xl font-bold text-slate-800">Loading Stock Portfolio...</h2>
        <p className="text-slate-500 mt-2">Computing live stock market holdings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Landmark size={28} />
            </div>
            Indian Stock Portfolio
          </h1>
          <p className="text-slate-500 mt-2">Live-ticking NSE equities portfolio, transaction ledger, and asset distribution.</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchPortfolio}
            className="p-3 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 active:scale-95 transition-all"
            title="Refresh prices"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => {
              setFormError('');
              setShowBuyModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 text-base"
          >
            <Plus size={20} className="stroke-[2.5]" />
            Buy Shares
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl">
          <AlertCircle className="flex-shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Total Value */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500 text-slate-900">
            <Wallet size={72} />
          </div>
          <div>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2">Portfolio Net Worth</p>
            <h3 className="text-2xl font-black text-slate-950">{formatINR(summary.totalCurrentValue)}</h3>
            <p className="text-slate-400 text-[11px] font-semibold mt-2.5">Live stock valuations today</p>
          </div>
        </div>

        {/* Total Invested */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500 text-slate-900">
            <Coins size={72} />
          </div>
          <div>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2">Total Capital Invested</p>
            <h3 className="text-2xl font-black text-slate-950">{formatINR(summary.totalInvested)}</h3>
            <p className="text-slate-400 text-[11px] font-semibold mt-2.5">Initial cash contribution</p>
          </div>
        </div>

        {/* Profit/Loss */}
        <div className={`rounded-2xl p-6 shadow-sm border relative overflow-hidden group transition-all duration-300
          ${isProfitable 
            ? 'bg-emerald-50/50 border-emerald-100 text-emerald-950 shadow-emerald-600/5' 
            : 'bg-rose-50/50 border-rose-100 text-rose-950 shadow-rose-600/5'}`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            {isProfitable ? <TrendingUp size={72} className="text-emerald-500" /> : <TrendingDown size={72} className="text-rose-500" />}
          </div>
          <div>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2">Net Profit / Loss</p>
            <h3 className="text-2xl font-black flex items-center gap-1.5">
              {isProfitable ? '+' : ''}{formatINR(profitLossTotal)}
            </h3>
            <span className={`inline-flex items-center gap-0.5 text-xs font-extrabold mt-2.5 px-2 py-0.5 rounded-full
              ${isProfitable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              {summary.totalProfitPercent}% Net Yield
            </span>
          </div>
        </div>

        {/* Total Holdings Counter */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500 text-slate-900">
            <Activity size={72} />
          </div>
          <div>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2">Active Securities</p>
            <h3 className="text-2xl font-black text-slate-950">{holdings.length} Positions</h3>
            <p className="text-slate-400 text-[11px] font-semibold mt-2.5">Unique equities held</p>
          </div>
        </div>

      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2/3 width) - Positions Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Coins size={18} className="text-emerald-600" />
                Holdings Position Ledger
              </h2>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-xl">
                NSE Markets
              </span>
            </div>

            <div className="overflow-x-auto">
              {holdings.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Coins size={44} className="mx-auto mb-3 opacity-20 text-indigo-500 animate-bounce" />
                  <h3 className="font-bold text-slate-700">Stock portfolio is currently empty</h3>
                  <p className="text-xs mt-1 max-w-sm mx-auto">Click "Buy Shares" to add high-performing NSE stocks like RELIANCE, TCS, or INFY.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="p-4 pl-6">Stock / Security</th>
                      <th className="p-4 text-right">Quantity</th>
                      <th className="p-4 text-right">Avg Price</th>
                      <th className="p-4 text-right">Live Price</th>
                      <th className="p-4 text-right">Current Value</th>
                      <th className="p-4 text-right">Total P&L</th>
                      <th className="p-4 pr-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {holdings.map((item) => {
                      const isUp = item.profitLoss >= 0;
                      const dailyIsUp = (item.changePercent || 0) >= 0;
                      
                      return (
                        <tr key={item._id} className="hover:bg-slate-50/40 transition-colors text-sm font-semibold text-slate-700">
                          <td className="p-4 pl-6">
                            <div>
                              <span className="text-slate-950 font-extrabold text-base block">{item.stockSymbol}</span>
                              <span className="text-[10px] text-slate-400 font-bold max-w-[150px] truncate block leading-normal">{item.stockName}</span>
                            </div>
                          </td>
                          <td className="p-4 text-right font-bold text-slate-950">{item.quantity}</td>
                          <td className="p-4 text-right">{formatINR(item.buyPrice)}</td>
                          <td className="p-4 text-right">
                            <span className="text-slate-950 font-bold">{formatINR(item.currentPrice)}</span>
                            {item.changePercent !== undefined && (
                              <span className={`block text-[10px] font-extrabold ${dailyIsUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {dailyIsUp ? '+' : ''}{item.changePercent?.toFixed(2)}%
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right font-black text-slate-950">{formatINR(item.currentValue)}</td>
                          <td className="p-4 text-right">
                            <span className={`font-black ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isUp ? '+' : ''}{formatINR(item.profitLoss)}
                            </span>
                            <span className={`block text-[10px] font-extrabold ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isUp ? '+' : ''}{item.profitPercentage}%
                            </span>
                          </td>
                          <td className="p-4 pr-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setBuyFormData(prev => ({
                                    ...prev,
                                    stockSymbol: item.stockSymbol,
                                    stockName: item.stockName,
                                    buyPrice: item.currentPrice
                                  }));
                                  setShowBuyModal(true);
                                }}
                                className="px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-extrabold transition-all"
                                title="Buy More"
                              >
                                Buy
                              </button>
                              <button
                                onClick={() => openSellModal(item)}
                                className="px-2.5 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-extrabold transition-all"
                                title="Sell Position"
                              >
                                Sell
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1/3 width) - Allocation Charts & Insights */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Portfolio Allocation Pie Chart */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm flex flex-col justify-between">
            <h2 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
              <PieIcon size={18} className="text-indigo-600" />
              Portfolio Allocation (NSE)
            </h2>

            {allocationData.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-semibold text-xs">
                No active stock holdings to draw allocation map.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {allocationData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val) => [formatINR(val), 'Value']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                  {allocationData.map((item, idx) => {
                    const totalVal = summary.totalCurrentValue || 1;
                    const percent = ((item.value / totalVal) * 100).toFixed(1);
                    return (
                      <div key={item.name} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-xl transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="text-xs font-bold text-slate-700">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-900">{formatINR(item.value)}</span>
                          <span className="text-[10px] text-slate-400 block font-semibold">{percent}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* AI Intelligence Advisory Box */}
          <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform text-white">
              <Sparkles size={64} />
            </div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="text-amber-400 animate-pulse" size={18} />
              <h4 className="font-extrabold text-sm uppercase tracking-wider">AI Portfolio Consultant</h4>
            </div>
            <p className="text-xs text-indigo-200 leading-relaxed font-medium">
              Want specific growth strategies and risk mitigation details for your NSE holdings? Visit our AI Advisor or trigger analysis on individual stocks in Market Intelligence tab.
            </p>
            <div className="mt-4 flex gap-2">
              <a 
                href="/investments/advisor"
                className="text-[10px] bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white px-3 py-1.5 rounded-lg font-bold inline-block"
              >
                Go to Advisor
              </a>
              <a 
                href="/stocks"
                className="text-[10px] bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all text-white px-3 py-1.5 rounded-lg font-bold inline-block"
              >
                Analyze Stocks
              </a>
            </div>
          </div>

        </div>

      </div>

      {/* Buy Shares Modal */}
      {showBuyModal && (
        <Modal 
          onClose={() => setShowBuyModal(false)}
          title="Buy Stock Shares"
        >
          <form onSubmit={handleBuySubmit} className="p-6 space-y-5 text-left">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-lg flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{formError}</span>
              </div>
            )}

            {/* Live stock search */}
            <div className="space-y-1.5 relative">
              <label className="text-xs font-bold text-slate-500 uppercase">Search Stock Ticker (NSE)</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="Type to search (e.g. Reliance, TCS, SBI)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Floating dropdown search results */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {searchResults.map((item) => (
                    <div 
                      key={item.symbol}
                      onClick={() => handleSelectStock(item)}
                      className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer flex justify-between items-center text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{item.symbol}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{item.companyName}</div>
                      </div>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">{item.market}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Stock Symbol</label>
                <input 
                  type="text" required readOnly
                  value={buyFormData.stockSymbol}
                  placeholder="Search & select stock"
                  className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Stock Name</label>
                <input 
                  type="text" required readOnly
                  value={buyFormData.stockName}
                  placeholder="Stock description"
                  className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Quantity (Shares)</label>
                <input 
                  type="number" required min="1"
                  value={buyFormData.quantity}
                  onChange={(e) => setBuyFormData(p => ({ ...p, quantity: e.target.value }))}
                  placeholder="e.g. 10"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Buy Price (₹)</label>
                <input 
                  type="number" required step="0.01" min="0.01"
                  value={buyFormData.buyPrice}
                  onChange={(e) => setBuyFormData(p => ({ ...p, buyPrice: e.target.value }))}
                  placeholder="e.g. 2450.50"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-indigo-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Purchase Date</label>
              <input 
                type="date" required
                value={buyFormData.purchaseDate}
                onChange={(e) => setBuyFormData(p => ({ ...p, purchaseDate: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Notes (Optional)</label>
              <textarea 
                value={buyFormData.notes}
                onChange={(e) => setBuyFormData(p => ({ ...p, notes: e.target.value }))}
                placeholder="Investment thesis or platform details..."
                rows="2"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex gap-4 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBuyModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading || !buyFormData.stockSymbol}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 active:scale-95"
              >
                {actionLoading ? 'Processing...' : 'Buy Stock'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Sell Shares Modal */}
      {showSellModal && (
        <Modal 
          onClose={() => setShowSellModal(false)}
          title="Sell Stock Shares"
        >
          <form onSubmit={handleSellSubmit} className="p-6 space-y-5 text-left">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-lg flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{formError}</span>
              </div>
            )}

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/50">
              <h4 className="font-extrabold text-slate-950 text-base">{sellFormData.stockSymbol}</h4>
              <p className="text-xs text-slate-500 font-semibold">{sellFormData.stockName}</p>
              <div className="mt-2 text-xs font-bold text-indigo-600">
                Max Quantity Available: {sellFormData.maxQuantity} shares
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Quantity to Sell</label>
              <input 
                type="number" required min="1" max={sellFormData.maxQuantity}
                value={sellFormData.quantity}
                onChange={(e) => setSellFormData(p => ({ ...p, quantity: e.target.value }))}
                placeholder={`Max: ${sellFormData.maxQuantity}`}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="flex gap-4 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSellModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading || !sellFormData.quantity}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50 active:scale-95"
              >
                {actionLoading ? 'Processing...' : 'Sell Stock'}
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}
