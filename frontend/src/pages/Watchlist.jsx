import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Star, Search, Trash2, RefreshCw, ArrowUpRight, ArrowDownRight, 
  TrendingUp, TrendingDown, Newspaper, ArrowLeft, Plus, X, AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Interaction loaders
  const [actionLoading, setActionLoading] = useState({ type: null, id: null });

  const token = localStorage.getItem('token');
  const getAuthHeader = () => token ? { Authorization: `Bearer ${token}` } : {};

  // Socket connection hooks
  const { subscribe, unsubscribe, socket, connected } = useSocket();

  // Fetch Watchlist items
  const fetchWatchlist = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/watchlist`, { headers: getAuthHeader() });
      if (res.data.success) {
        setWatchlist(res.data.data);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching watchlist:', err);
      if (!isSilent) {
        setError(err.response?.data?.message || 'Failed to fetch watchlist. Please check your connection.');
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  // Watchlist Search handler with debounce
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

  // Handle Socket subscriptions
  useEffect(() => {
    if (watchlist.length === 0) return;
    const symbols = watchlist.map(item => item.symbol);
    subscribe(symbols);

    return () => {
      unsubscribe(symbols);
    };
  }, [watchlist.map(item => item.symbol).join(','), subscribe, unsubscribe]);

  // Handle live socket price updates
  useEffect(() => {
    if (!socket) return;

    const handlePriceUpdate = (data) => {
      const { symbol, price, change, changePercent } = data;
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
    };

    socket.on('priceUpdate', handlePriceUpdate);

    return () => {
      socket.off('priceUpdate', handlePriceUpdate);
    };
  }, [socket]);

  // Initial load and fallback polling setup
  useEffect(() => {
    fetchWatchlist();

    // Fallback polling: if socket is disconnected, poll REST API
    const interval = setInterval(() => {
      if (!connected) {
        fetchWatchlist(true);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchWatchlist, connected]);

  // Add stock handler
  const handleAddStock = async (stock) => {
    setActionLoading({ type: 'add', id: stock.symbol });
    try {
      const res = await axios.post(`${API_URL}/watchlist/add`, {
        symbol: stock.symbol,
        companyName: stock.companyName || stock.symbol,
        market: stock.market || 'Global'
      }, { headers: getAuthHeader() });

      if (res.data.success) {
        await fetchWatchlist(true);
        setSearchQuery('');
        setSearchResults([]);
        setShowDropdown(false);
      }
    } catch (err) {
      console.error('Error adding stock:', err);
      alert(err.response?.data?.message || `Failed to add ${stock.symbol} to watchlist.`);
    } finally {
      setActionLoading({ type: null, id: null });
    }
  };

  // Remove stock handler
  const handleRemoveStock = async (id, symbol) => {
    if (!window.confirm(`Are you sure you want to remove ${symbol} from your watchlist?`)) {
      return;
    }
    setActionLoading({ type: 'remove', id });
    try {
      const res = await axios.delete(`${API_URL}/watchlist/${id}`, { headers: getAuthHeader() });
      if (res.data.success) {
        setWatchlist(prev => prev.filter(item => item._id !== id));
      }
    } catch (err) {
      console.error('Error removing stock:', err);
      alert('Failed to remove stock from watchlist.');
    } finally {
      setActionLoading({ type: null, id: null });
    }
  };

  // Utility to format values
  const formatPrice = (val, symbol) => {
    if (val === null || val === undefined) return 'N/A';
    return '₹' + Number(val).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const getPriceChangeStyle = (change) => {
    if (!change) return 'text-slate-400 bg-slate-50 border-slate-100';
    return change >= 0 
      ? 'text-emerald-700 bg-emerald-50/80 border-emerald-100' 
      : 'text-rose-700 bg-rose-50/80 border-rose-100';
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 rounded-2xl border border-amber-200 shadow-sm shadow-amber-200/10">
              <Star className="text-amber-500 fill-amber-500" size={28} />
            </div>
            Market Watchlist
          </h1>
          <p className="text-slate-500 mt-2 text-base">
            Track real-time valuations, daily changes, and price metrics for your selected assets.
          </p>
        </div>
        
        {/* Refresh Indicator */}
        <button
          onClick={() => fetchWatchlist(false)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-950 font-bold rounded-xl transition-all shadow-sm text-sm disabled:opacity-50 active:scale-95"
        >
          <RefreshCw size={16} className={`${loading ? 'animate-spin' : ''}`} />
          Force Refresh
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl shadow-sm">
          <AlertCircle className="flex-shrink-0" />
          <span className="font-semibold text-sm">{error}</span>
        </div>
      )}

      {/* Search & Autocomplete Panel */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm relative z-30">
        <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Search size={18} className="text-slate-400" />
          Add Assets to Watchlist
        </h2>
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="absolute left-4 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Search Indian stock tickers (e.g. RELIANCE, TCS, HDFCBANK)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full pl-12 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="absolute right-4 p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {showDropdown && searchQuery.trim().length >= 2 && (
            <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
              {searching ? (
                <div className="p-4 flex items-center justify-center gap-3 text-slate-500 text-sm">
                  <RefreshCw className="animate-spin text-blue-500" size={16} />
                  <span>Searching NSE stocks...</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-sm">
                  No assets found matching "{searchQuery}".
                </div>
              ) : (
                searchResults.map((stock) => {
                  const isAlreadyAdded = watchlist.some(item => item.symbol === stock.symbol);
                  return (
                    <div 
                      key={stock.symbol}
                      className="px-5 py-3.5 hover:bg-slate-50/80 flex justify-between items-center transition-all group"
                    >
                      <div className="min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-sm">{stock.symbol}</span>
                          <span className="px-1.5 py-0.5 bg-slate-100 text-[10px] text-slate-500 font-bold rounded uppercase tracking-wide">{stock.market}</span>
                        </div>
                        <div className="text-xs text-slate-500 truncate mt-0.5">{stock.companyName}</div>
                      </div>

                      <button
                        onClick={() => !isAlreadyAdded && handleAddStock(stock)}
                        disabled={isAlreadyAdded || (actionLoading.type === 'add' && actionLoading.id === stock.symbol)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all
                          ${isAlreadyAdded 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white group-hover:scale-[1.02] active:scale-95'}`}
                      >
                        {actionLoading.type === 'add' && actionLoading.id === stock.symbol ? (
                          <RefreshCw className="animate-spin" size={12} />
                        ) : isAlreadyAdded ? (
                          'Added'
                        ) : (
                          <>
                            <Plus size={12} /> Add Watchlist
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Watchlist Dashboard */}
      {loading ? (
        // Loading Skeleton
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-sm animate-pulse space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-6 w-20 bg-slate-100 rounded-lg"></div>
                <div className="h-5 w-12 bg-slate-100 rounded-md"></div>
              </div>
              <div className="h-4 w-40 bg-slate-100 rounded"></div>
              <div className="h-8 w-28 bg-slate-100 rounded-lg"></div>
              <div className="flex justify-between items-center pt-2">
                <div className="h-6 w-24 bg-slate-100 rounded-full"></div>
                <div className="h-8 w-8 bg-slate-100 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      ) : watchlist.length === 0 ? (
        // Empty State
        <div className="bg-white rounded-3xl border border-slate-200/60 p-12 text-center shadow-sm max-w-xl mx-auto">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl border border-amber-200/50 flex items-center justify-center mx-auto mb-6">
            <Star className="text-amber-500 fill-amber-500 animate-pulse" size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Watchlist is Empty</h3>
          <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
            Use the search bar above to look up stocks, index ETFs, or cryptocurrencies, and add them to monitor live prices.
          </p>
          <div className="flex justify-center gap-3">
            {['RELIANCE', 'TCS', 'INFY'].map((sym) => (
              <button
                key={sym}
                onClick={() => setSearchQuery(sym)}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors"
              >
                Find {sym}
              </button>
            ))}
          </div>
        </div>
      ) : (
        // Grid cards
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {watchlist.map((item) => {
            const isUp = (item.change || 0) >= 0;
            const changePercent = item.changePercent || 0;
            const change = item.change || 0;
            
            return (
              <div 
                key={item._id}
                className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 relative group flex flex-col justify-between"
              >
                <div>
                  {/* Top info row */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-slate-950 uppercase tracking-tight">{item.symbol}</span>
                      <span className="px-1.5 py-0.5 bg-slate-100 text-[9px] text-slate-500 font-extrabold rounded uppercase tracking-wide">
                        {item.market}
                      </span>
                    </div>

                    <button
                      onClick={() => handleRemoveStock(item._id, item.symbol)}
                      disabled={actionLoading.type === 'remove' && actionLoading.id === item._id}
                      className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all active:scale-95"
                      title="Remove from Watchlist"
                    >
                      {actionLoading.type === 'remove' && actionLoading.id === item._id ? (
                        <RefreshCw className="animate-spin text-rose-500" size={14} />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>

                  {/* Company Name */}
                  <p className="text-slate-500 text-xs font-medium truncate mt-1 max-w-[200px]" title={item.companyName}>
                    {item.companyName}
                  </p>
                </div>

                {/* Price Display */}
                <div className="my-6">
                  <div className="text-3xl font-black text-slate-950 tracking-tight">
                    {formatPrice(item.currentPrice, item.symbol)}
                  </div>
                  
                  {item.currentPrice !== null ? (
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 border text-xs font-black rounded-full ${getPriceChangeStyle(change)}`}>
                        {isUp ? <ArrowUpRight size={12} className="stroke-[3]" /> : <ArrowDownRight size={12} className="stroke-[3]" />}
                        {isUp ? '+' : ''}{changePercent.toFixed(2)}%
                      </span>
                      <span className={`text-xs font-bold ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isUp ? '+' : ''}{change.toFixed(2)} Today
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs font-bold text-slate-400 mt-2">
                      Live price currently unavailable
                    </div>
                  )}
                </div>

                {/* Footer metrics / actions */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                  <div className="text-[10px] text-slate-400 font-semibold">
                    Added: {new Date(item.addedAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>

                  <Link 
                    to="/stocks" 
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Interactive Chart
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
