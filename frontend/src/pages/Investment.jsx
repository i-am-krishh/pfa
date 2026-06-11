import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { 
  TrendingUp, Plus, Trash2, Edit2, Eye, TrendingDown, Wallet, 
  Activity, Search, Star, RefreshCw, ArrowUpRight, ArrowDownRight, 
  Newspaper, Landmark, Coins, Briefcase, ChevronRight, ShieldAlert,
  ArrowUp, ArrowDown, ExternalLink, Sparkles
} from 'lucide-react'
import Modal from '../components/Modal'
import { useSocket } from '../context/SocketContext'
import { 
  PieChart as RechartsPieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts'
import PortfolioTracker from './PortfolioTracker'

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function Investment() {
  const [activeTab, setActiveTab] = useState('assets') // 'assets' | 'stocks'
  const [investments, setInvestments] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [viewingId, setViewingId] = useState(null)
  
  // KPI Metrics
  const [totalInvested, setTotalInvested] = useState(0)
  const [totalCurrentValue, setTotalCurrentValue] = useState(0)
  const [dailyGainLoss, setDailyGainLoss] = useState(0)
  const [dailyGainLossPercent, setDailyGainLossPercent] = useState(0)

  // Sub-modules state
  const [watchlist, setWatchlist] = useState([])
  const [trending, setTrending] = useState({ gainers: [], losers: [] })
  const [news, setNews] = useState([])
  const [marketIndices, setMarketIndices] = useState([])
  
  // Loading and Error states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [watchlistLoading, setWatchlistLoading] = useState(false)
  const [newsLoading, setNewsLoading] = useState(false)
  const [trendingLoading, setTrendingLoading] = useState(false)

  // Watchlist Search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchingStocks, setSearchingStocks] = useState(false)

  // Suggestions for asset form
  const [suggestions, setSuggestions] = useState([])
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [familyGroups, setFamilyGroups] = useState([])

  const [formData, setFormData] = useState({
    type: 'stocks',
    name: '',
    symbol: '',
    amount: '',
    currentValue: '',
    quantity: '',
    pricePerUnit: '',
    fetchedStockPrice: 0,
    investmentDate: new Date().toISOString().split('T')[0],
    expectedReturnPercentage: '',
    riskLevel: 'medium',
    broker: '',
    description: '',
    familyGroupId: '',
    familySyncEnabled: false
  })

  const [livePriceInfo, setLivePriceInfo] = useState({
    price: null,
    lastUpdated: null,
    exchange: null,
    error: null,
    loading: false
  })

  const token = localStorage.getItem('token')
  const getAuthHeader = () => token ? { Authorization: `Bearer ${token}` } : {};

  const [quotes, setQuotes] = useState({});
  const { subscribe, unsubscribe, socket, connected } = useSocket();

  // Fetch investments
  const fetchInvestments = async () => {
    try {
      const response = await axios.get(`${API_URL}/investment`, {
        headers: getAuthHeader()
      })
      setInvestments(response.data.investments)
      setTotalInvested(response.data.totalInvested)
      setTotalCurrentValue(response.data.totalCurrentValue)
      
      // Calculate daily gain percentage based on available assets
      calculateDailyChange(response.data.investments)
    } catch (err) {
      console.error('Error fetching investments:', err)
      setError('Could not load investment portfolio.')
    }
  }

  const updatePortfolioMetrics = (assetsList, currentQuotes) => {
    let totalVal = 0;
    let totalInv = 0;
    let dailySum = 0;

    assetsList.forEach(asset => {
      const ticker = (asset.symbol || asset.name.split(' ')[0]).toUpperCase();
      const quote = currentQuotes[ticker];
      let val = asset.currentValue || 0;

      if (quote) {
        if (quote.currentPrice && asset.quantity > 0) {
          val = asset.quantity * quote.currentPrice;
        }
        dailySum += val * ((quote.percentageChange || 0) / 100);
      } else {
        dailySum += val * 0.0012;
      }

      totalVal += val;
      totalInv += asset.amount || 0;
    });

    setTotalCurrentValue(totalVal);
    setTotalInvested(totalInv);
    setDailyGainLoss(dailySum);
    setDailyGainLossPercent(totalInv > 0 ? (dailySum / totalInv) * 100 : 0);
  };

  // Calculate daily gain/loss dynamically from assets
  const calculateDailyChange = async (assetsList) => {
    if (!assetsList || assetsList.length === 0) {
      setDailyGainLoss(0);
      setDailyGainLossPercent(0);
      return;
    }

    try {
      // Gather unique tickers in our portfolio to query live quotes
      const tickerSet = new Set(
        assetsList
          .filter(a => ['stocks', 'crypto', 'mutual_funds'].includes(a.type))
          .map(a => (a.symbol || a.name.split(' ')[0]).toUpperCase())
          .filter(Boolean)
      );

      const quotesMap = {};
      await Promise.all(
        Array.from(tickerSet).map(async (ticker) => {
          try {
            const res = await axios.get(`${API_URL}/stocks/quote/${ticker}`, { headers: getAuthHeader() });
            if (res.data.success) {
              quotesMap[ticker] = res.data.data;
            }
          } catch (err) {
            // ignore
          }
        })
      );

      setQuotes(quotesMap);
      updatePortfolioMetrics(assetsList, quotesMap);
    } catch (error) {
      console.error("Error calculating daily change:", error);
    }
  };

  // Fetch Watchlist
  const fetchWatchlist = useCallback(async () => {
    setWatchlistLoading(true)
    try {
      const res = await axios.get(`${API_URL}/watchlist`, { headers: getAuthHeader() })
      if (res.data.success) {
        setWatchlist(res.data.data)
      }
    } catch (err) {
      console.error('Error fetching watchlist:', err)
    } finally {
      setWatchlistLoading(false)
    }
  }, [])

  // Fetch News
  const fetchNews = async () => {
    setNewsLoading(true)
    try {
      const res = await axios.get(`${API_URL}/stocks/news`, { headers: getAuthHeader() })
      if (res.data.success) {
        setNews(res.data.data)
      }
    } catch (err) {
      console.error('Error fetching news:', err)
    } finally {
      setNewsLoading(false)
    }
  }

  // Fetch Trending
  const fetchTrending = async () => {
    setTrendingLoading(true)
    try {
      const res = await axios.get(`${API_URL}/stocks/trending`, { headers: getAuthHeader() })
      if (res.data.success) {
        setTrending(res.data.data)
      }
    } catch (err) {
      console.error('Error fetching trending stocks:', err)
    } finally {
      setTrendingLoading(false)
    }
  }

  // Fetch Market Indices
  const fetchMarketIndices = async () => {
    try {
      const res = await axios.get(`${API_URL}/market/overview`, { headers: getAuthHeader() });
      if (res.data.success) {
        setMarketIndices(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching market indices:', err)
    }
  };

  // Fetch all dashboard data
  const fetchAllDashboardData = async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([
        fetchInvestments(),
        fetchWatchlist(),
        fetchTrending(),
        fetchNews(),
        fetchMarketIndices(),
        fetchFamilyGroups()
      ])
    } catch (err) {
      console.error('Error loading dashboard:', err)
      setError('Failed to refresh investment dashboard data.')
    } finally {
      setLoading(false)
    }
  }

  // Subscribe to all relevant symbols on the investment dashboard
  useEffect(() => {
    const holdingSymbols = investments
      .filter(a => ['stocks', 'crypto', 'mutual_funds'].includes(a.type))
      .map(a => (a.symbol || a.name.split(' ')[0]).toUpperCase())
      .filter(Boolean);

    const watchlistSymbols = watchlist.map(item => item.symbol.toUpperCase());
    const indexSymbols = ['^NSEI', '^BSESN', '^NSEBANK', '^CNXIT', '^CNXAUTO', '^CNXFMCG', '^CNXPHARMA'];

    const allSymbols = Array.from(new Set([...holdingSymbols, ...watchlistSymbols, ...indexSymbols]));
    subscribe(allSymbols);

    return () => {
      unsubscribe(allSymbols);
    };
  }, [
    investments.map(a => (a.symbol || a.name.split(' ')[0]).toUpperCase()).join(','),
    watchlist.map(item => item.symbol).join(','),
    subscribe,
    unsubscribe
  ]);

  // Handle live socket price updates
  useEffect(() => {
    if (!socket) return;

    const handlePriceUpdate = (data) => {
      const { symbol, price, change, changePercent } = data;
      const ticker = symbol.toUpperCase();

      // 1. Update Market Indices
      setMarketIndices(prevIndices => {
        return prevIndices.map(idx => {
          if (idx.symbol.toUpperCase() === ticker) {
            return {
              ...idx,
              currentPrice: price,
              changePercent
            };
          }
          return idx;
        });
      });

      // 2. Update Watchlist items
      setWatchlist(prevWatchlist => {
        return prevWatchlist.map(item => {
          if (item.symbol.toUpperCase() === ticker) {
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

      // 3. Update Investments holdings and KPIs
      setQuotes(prevQuotes => {
        const updatedQuotes = {
          ...prevQuotes,
          [ticker]: {
            currentPrice: price,
            percentageChange: changePercent
          }
        };

        setInvestments(prevInvestments => {
          const updatedInvestments = prevInvestments.map(inv => {
            const invTicker = (inv.symbol || inv.name.split(' ')[0]).toUpperCase();
            if (invTicker === ticker && inv.quantity > 0) {
              return {
                ...inv,
                currentValue: Number((inv.quantity * price).toFixed(2))
              };
            }
            return inv;
          });

          // Recalculate portfolio-wide summary metrics
          updatePortfolioMetrics(updatedInvestments, updatedQuotes);
          return updatedInvestments;
        });

        return updatedQuotes;
      });
    };

    socket.on('priceUpdate', handlePriceUpdate);

    return () => {
      socket.off('priceUpdate', handlePriceUpdate);
    };
  }, [socket]);

  // Initial load and fallback polling setup
  useEffect(() => {
    fetchAllDashboardData();

    // Fallback polling: if socket is disconnected, poll index prices and watchlist
    const interval = setInterval(() => {
      if (!connected) {
        fetchMarketIndices();
        fetchWatchlist();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [connected]);

  const fetchFamilyGroups = async () => {
    try {
      const response = await axios.get(`${API_URL}/family/my-families`, {
        headers: getAuthHeader()
      })
      setFamilyGroups(response.data.data)
    } catch (error) {
      console.error('Error fetching family groups:', error)
    }
  }

  // Watchlist Search handler
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setSearchingStocks(true);
      try {
        const res = await axios.get(`${API_URL}/stocks/search?q=${searchQuery}`, { headers: getAuthHeader() });
        if (res.data.success) {
          setSearchResults(res.data.results);
        }
      } catch (err) {
        console.error('Error searching stocks:', err);
      } finally {
        setSearchingStocks(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Asset Form Name Suggestions search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (['stocks', 'mutual_funds'].includes(formData.type) && formData.name.length > 2) {
        setIsSearchingSuggestions(true)
        try {
          const res = await axios.get(`${API_URL}/stocks/search?q=${formData.name}`, { headers: getAuthHeader() });
          if (res.data.success) {
            // Map keys
            const mapped = res.data.results.map(item => ({
              symbol: item.symbol,
              name: item.companyName,
              companyName: item.companyName,
              market: item.market
            }));
            setSuggestions(mapped.slice(0, 5));
          }
        } catch (error) {
          console.error("Failed to fetch suggestions", error);
        } finally {
          setIsSearchingSuggestions(false)
        }
      } else {
        setSuggestions([])
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [formData.name, formData.type])

  const handleRefreshStockPrice = async (overrideSymbol = null) => {
    const querySymbol = overrideSymbol || formData.symbol || formData.name;
    if (!querySymbol || querySymbol.trim().length === 0) {
      setLivePriceInfo(prev => ({
        ...prev,
        error: 'Please enter a Stock Symbol or select a suggestion first.'
      }));
      return;
    }

    setLivePriceInfo(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await axios.get(`${API_URL}/stocks/${querySymbol.trim()}`, { headers: getAuthHeader() });
      const data = res.data;
      if (data && data.currentPrice !== undefined) {
        const price = data.currentPrice;
        const lastUpdatedDate = data.timestamp ? new Date(data.timestamp) : new Date();
        const hhmm = lastUpdatedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        setLivePriceInfo({
          price: price,
          lastUpdated: hhmm,
          exchange: data.exchange || 'Yahoo Finance',
          error: null,
          loading: false
        });

        setFormData(prev => {
          const qty = prev.quantity && !isNaN(parseFloat(prev.quantity)) ? parseFloat(prev.quantity) : 1;
          const calculatedValue = Number((qty * price).toFixed(2));
          return {
            ...prev,
            symbol: data.symbol || prev.symbol || querySymbol.toUpperCase(),
            name: data.companyName || prev.name,
            currentValue: calculatedValue,
            fetchedStockPrice: price
          };
        });
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (err) {
      console.error('Failed to fetch stock quote:', err);
      setLivePriceInfo(prev => ({
        ...prev,
        error: 'Live Price Unavailable',
        loading: false
      }));
    }
  }

  const selectSuggestion = async (item) => {
    setFormData(prev => ({
      ...prev,
      name: item.companyName || item.name || item.symbol,
      symbol: item.symbol || '',
      pricePerUnit: item.currentPrice || prev.pricePerUnit || ''
    }))
    setSuggestions([])

    if (item.symbol) {
      await handleRefreshStockPrice(item.symbol);
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'name') setShowSuggestions(true)

    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: value
      };

      // Auto-calculate for Stocks
      if (prev.type === 'stocks') {
        const rawQty = name === 'quantity' ? value : prev.quantity;
        const qty = rawQty && !isNaN(parseFloat(rawQty)) ? parseFloat(rawQty) : 1;
        const price = prev.fetchedStockPrice ? parseFloat(prev.fetchedStockPrice) : (livePriceInfo.price ? parseFloat(livePriceInfo.price) : 0);
        const buyPrice = name === 'pricePerUnit' ? parseFloat(value) : (prev.pricePerUnit ? parseFloat(prev.pricePerUnit) : 0);
        
        if (price > 0) {
          updated.currentValue = Number((qty * price).toFixed(2));
        }
        if (!isNaN(qty) && !isNaN(buyPrice) && qty > 0 && buyPrice > 0) {
          updated.amount = Number((qty * buyPrice).toFixed(2));
        }
      }

      return updated;
    });
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        currentValue: parseFloat(formData.currentValue),
        quantity: formData.quantity ? parseFloat(formData.quantity) : 0,
        pricePerUnit: formData.pricePerUnit ? parseFloat(formData.pricePerUnit) : 0,
        expectedReturnPercentage: formData.expectedReturnPercentage ? parseFloat(formData.expectedReturnPercentage) : 0,
        familySync: {
          enabled: formData.familySyncEnabled,
          familyId: formData.familySyncEnabled && familyGroups.length > 0 ? familyGroups[0]._id : null,
          visibility: 'family'
        }
      }

      if (editingId) {
        await axios.put(`${API_URL}/investment/${editingId}`, payload, {
          headers: getAuthHeader()
        })
      } else {
        await axios.post(`${API_URL}/investment`, payload, {
          headers: getAuthHeader()
        })
      }

      fetchInvestments()
      resetForm()
    } catch (error) {
      console.error('Error saving investment:', error)
    }
  }

  const handleEdit = (investment) => {
    setFormData({
      type: investment.type,
      name: investment.name,
      symbol: investment.symbol || '',
      amount: investment.amount,
      currentValue: investment.currentValue,
      quantity: investment.quantity,
      pricePerUnit: investment.pricePerUnit,
      fetchedStockPrice: investment.fetchedStockPrice || 0,
      investmentDate: investment.investmentDate.split('T')[0],
      expectedReturnPercentage: investment.expectedReturnPercentage,
      riskLevel: investment.riskLevel,
      broker: investment.broker,
      description: investment.description,
      familyGroupId: investment.familyGroupId || '',
      familySyncEnabled: investment.familySync?.enabled || false
    })
    setEditingId(investment._id)

    // Set live price details for editing stock
    if (investment.type === 'stocks') {
      const price = investment.fetchedStockPrice || (investment.quantity > 0 ? (investment.currentValue / investment.quantity) : 0);
      const updatedDate = investment.updatedAt ? new Date(investment.updatedAt) : new Date();
      const hhmm = updatedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLivePriceInfo({
        price: price || null,
        lastUpdated: hhmm,
        exchange: 'Yahoo Finance',
        error: null,
        loading: false
      });
    } else {
      setLivePriceInfo({
        price: null,
        lastUpdated: null,
        exchange: null,
        error: null,
        loading: false
      });
    }

    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this investment?')) {
      try {
        await axios.delete(`${API_URL}/investment/${id}`, {
          headers: getAuthHeader()
        })
        fetchInvestments()
      } catch (error) {
        console.error('Error deleting investment:', error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      type: 'stocks',
      name: '',
      symbol: '',
      amount: '',
      currentValue: '',
      quantity: '',
      pricePerUnit: '',
      fetchedStockPrice: 0,
      investmentDate: new Date().toISOString().split('T')[0],
      expectedReturnPercentage: '',
      riskLevel: 'medium',
      broker: '',
      description: '',
      familyGroupId: '',
      familySyncEnabled: false
    })
    setEditingId(null)
    setLivePriceInfo({
      price: null,
      lastUpdated: null,
      exchange: null,
      error: null,
      loading: false
    })
    setShowForm(false)
  }

  const handleAddToWatchlist = async (symbol, name, market) => {
    try {
      await axios.post(`${API_URL}/watchlist/add`, {
        symbol,
        companyName: name,
        market: market || 'NASDAQ'
      }, { headers: getAuthHeader() })
      
      fetchWatchlist()
      setSearchQuery('')
      setSearchResults([])
    } catch (err) {
      console.error('Error adding stock to watchlist:', err)
      alert(err.response?.data?.message || 'Failed to add to watchlist')
    }
  }

  const handleRemoveFromWatchlist = async (id) => {
    if (!window.confirm('Remove from watchlist?')) return;
    try {
      await axios.delete(`${API_URL}/watchlist/${id}`, { headers: getAuthHeader() })
      fetchWatchlist()
    } catch (err) {
      console.error('Error removing from watchlist:', err)
    }
  }

  // Format Helper
  const formatINR = (val) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    });
  }

  const getTypeLabel = (type) => {
    const labels = {
      'stocks': 'Stocks',
      'mutual_funds': 'Mutual Funds',
      'crypto': 'Cryptocurrency',
      'bonds': 'Bonds',
      'real_estate': 'Real Estate',
      'other': 'Other'
    }
    return labels[type] || type
  }

  const getRiskColor = (risk) => {
    switch(risk) {
      case 'low': return 'text-green-500 bg-green-50 border-green-200'
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200'
      case 'high': return 'text-rose-600 bg-rose-50 border-rose-200'
      default: return 'text-slate-500 bg-slate-50 border-slate-200'
    }
  }

  // Recharts color palette
  const COLORS = ['#2563eb', '#9333ea', '#db2777', '#d97706', '#059669', '#64748b'];

  // Prepare Pie Chart Allocation data
  const allocationMap = {};
  investments.forEach(inv => {
    const t = inv.type || 'other';
    allocationMap[t] = (allocationMap[t] || 0) + (inv.currentValue || 0);
  });
  
  const pieData = Object.keys(allocationMap).map(type => ({
    name: getTypeLabel(type),
    value: allocationMap[type]
  })).filter(item => item.value > 0);

  const profitLossTotal = totalCurrentValue - totalInvested;
  const isProfitableTotal = profitLossTotal >= 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
        <RefreshCw className="animate-spin text-blue-600 mb-4" size={40} />
        <h2 className="text-xl font-bold text-slate-800">Loading Investment Dashboard...</h2>
        <p className="text-slate-500 mt-2">Aggregating quotes, news, and holdings details...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-2xl">
              <Briefcase className="text-blue-600" size={32} />
            </div>
            Investments Dashboard
          </h1>
          <p className="text-slate-500 mt-2 text-lg">Consolidated individual portfolio analytics, live tracking, and news intelligence.</p>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/investments/analytics"
            className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 font-bold px-6 py-3.5 rounded-xl transition-all border border-blue-100/80 active:scale-95 text-base"
          >
            <Activity size={18} className="text-blue-600" />
            Analytics
          </Link>
          <Link
            to="/investments/advisor"
            className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-700 font-bold px-6 py-3.5 rounded-xl transition-all border border-indigo-100/80 active:scale-95 text-base"
          >
            <Sparkles size={18} className="text-indigo-600 animate-pulse" />
            AI Advisor
          </Link>
          {activeTab === 'assets' && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 text-base"
            >
              <Plus size={20} className="stroke-[2.5]" />
              Add Asset Class
            </button>
          )}
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 w-max shadow-sm">
        <button
          onClick={() => setActiveTab('assets')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'assets'
              ? 'bg-white text-blue-700 shadow-md'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <Briefcase size={16} /> Asset Inventory
        </button>
        <button
          onClick={() => setActiveTab('stocks')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'stocks'
              ? 'bg-white text-indigo-700 shadow-md'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <TrendingUp size={16} /> Indian Stocks Portfolio
        </button>
      </div>

      {activeTab === 'stocks' ? (
        <PortfolioTracker />
      ) : (
        <>
          {error && (
            <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl">
              <ShieldAlert className="flex-shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Total Invested */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500 text-slate-900">
            <Wallet size={72} />
          </div>
          <div>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2">Total Invested</p>
            <h3 className="text-2xl font-black text-slate-950">{formatINR(totalInvested)}</h3>
            <p className="text-slate-400 text-[11px] font-semibold mt-2.5">Initial capital contribution</p>
          </div>
        </div>

        {/* Current Value */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500 text-slate-900">
            <Activity size={72} />
          </div>
          <div>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2">Current Value</p>
            <h3 className="text-2xl font-black text-slate-950">{formatINR(totalCurrentValue)}</h3>
            <p className="text-slate-400 text-[11px] font-semibold mt-2.5">Asset valuations today</p>
          </div>
        </div>

        {/* Total Profit/Loss */}
        <div className={`rounded-2xl p-6 shadow-sm border relative overflow-hidden group transition-all duration-300
          ${isProfitableTotal 
            ? 'bg-emerald-50/50 border-emerald-100 text-emerald-950 shadow-emerald-600/5' 
            : 'bg-rose-50/50 border-rose-100 text-rose-950 shadow-rose-600/5'}`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            {isProfitableTotal ? <TrendingUp size={72} className="text-emerald-500" /> : <TrendingDown size={72} className="text-rose-500" />}
          </div>
          <div>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2">Total Profit / Loss</p>
            <h3 className="text-2xl font-black flex items-center gap-1.5">
              {isProfitableTotal ? '+' : ''}{formatINR(profitLossTotal)}
            </h3>
            <span className={`inline-flex items-center gap-0.5 text-xs font-extrabold mt-2.5 px-2 py-0.5 rounded-full
              ${isProfitableTotal ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              {totalInvested > 0 ? ((profitLossTotal / totalInvested) * 100).toFixed(2) : 0}% Return
            </span>
          </div>
        </div>

        {/* Daily Gain/Loss */}
        <div className={`rounded-2xl p-6 shadow-sm border relative overflow-hidden group transition-all duration-300
          ${dailyGainLoss >= 0 
            ? 'bg-emerald-50/50 border-emerald-100 text-emerald-950' 
            : 'bg-rose-50/50 border-rose-100 text-rose-950'}`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            {dailyGainLoss >= 0 ? <ArrowUpRight size={72} className="text-emerald-500" /> : <ArrowDownRight size={72} className="text-rose-500" />}
          </div>
          <div>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2">Daily Gain / Loss</p>
            <h3 className="text-2xl font-black flex items-center gap-1.5">
              {dailyGainLoss >= 0 ? '+' : ''}{formatINR(dailyGainLoss)}
            </h3>
            <span className={`inline-flex items-center gap-0.5 text-xs font-extrabold mt-2.5 px-2 py-0.5 rounded-full
              ${dailyGainLoss >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              {dailyGainLoss >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
              {Math.abs(dailyGainLossPercent).toFixed(2)}% Today
            </span>
          </div>
        </div>

      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Indices, Allocation, Holdings */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section 1: Market Overview Indices */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Activity size={18} className="text-blue-600" />
                Market Overview
              </h2>
              <span className="text-[10px] font-extrabold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">Index trackers</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
              {marketIndices.map((idx) => {
                const pct = idx.changePercent !== undefined ? idx.changePercent : (idx.percentageChange || 0);
                const isUp = pct >= 0;
                const price = idx.currentPrice !== undefined ? idx.currentPrice : (idx.currentValue || 0);
                return (
                  <div key={idx.symbol} className="bg-slate-50 p-4 rounded-xl border border-slate-200/40 relative">
                    <span className="block text-[10px] font-extrabold text-slate-400 uppercase truncate" title={idx.name}>
                      {idx.name}
                    </span>
                    <div className="text-base font-black text-slate-950 mt-1.5">
                      {formatINR(price)}
                    </div>
                    <div className={`flex items-center gap-0.5 text-xs font-black mt-1
                      ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isUp ? '+' : ''}{pct.toFixed(2)}%
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Section 2: Asset Allocation (Piechart) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm">
            <h2 className="text-lg font-extrabold text-slate-900 mb-5 flex items-center gap-2">
              <Landmark size={18} className="text-indigo-600" />
              Asset Allocation
            </h2>
            
            {pieData.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <p className="text-sm font-semibold">No assets found to draw allocation chart.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Recharts container */}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(val) => [formatINR(val), 'Value']} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>

                {/* Values list */}
                <div className="space-y-3">
                  {pieData.map((item, index) => (
                    <div key={item.name} className="flex justify-between items-center p-2.5 hover:bg-slate-50 rounded-xl transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-sm font-bold text-slate-700">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-slate-900">{formatINR(item.value)}</span>
                        <span className="text-xs text-slate-400 block font-semibold">{((item.value / totalCurrentValue) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Holdings (Your Assets List) */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Coins size={18} className="text-emerald-600" />
                Holdings Inventory
              </h2>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl">
                {investments.length} Active {investments.length === 1 ? 'Asset' : 'Assets'}
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {investments.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Coins size={44} className="mx-auto mb-3 opacity-20 text-indigo-500 animate-bounce" />
                  <h3 className="font-bold text-slate-700">Your holdings represent here</h3>
                  <p className="text-xs mt-1 max-w-sm mx-auto">Click "Add Asset Class" above to add your stocks, crypto, mutual funds, real estate, etc.</p>
                </div>
              ) : (
                investments.map((inv) => {
                  const profit = inv.currentValue - inv.amount;
                  const roi = inv.amount > 0 ? ((inv.currentValue - inv.amount) / inv.amount * 100).toFixed(2) : 0;
                  const isUp = profit >= 0;

                  return (
                    <div key={inv._id} className="p-5 hover:bg-slate-50/40 transition-colors group">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-extrabold text-slate-900 text-base truncate">{inv.name}</span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase tracking-wider">{getTypeLabel(inv.type)}</span>
                            <span className={`px-2 py-0.5 border text-[10px] font-bold rounded ${getRiskColor(inv.riskLevel)}`}>{inv.riskLevel}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-semibold">
                            {inv.broker && <span>Platform: {inv.broker}</span>}
                            <span>•</span>
                            <span>Acquired: {new Date(inv.investmentDate).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Financial figures */}
                        <div className="flex items-center gap-6 flex-shrink-0 self-end sm:self-center">
                          <div className="text-right">
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Value / Cost</span>
                            <span className="font-black text-slate-900 text-sm">{formatINR(inv.currentValue)}</span>
                            <span className="text-xs text-slate-400 block">Cost: {formatINR(inv.amount)}</span>
                          </div>
                          
                          <div className="text-right">
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">ROI</span>
                            <span className={`font-black text-sm flex items-center justify-end gap-0.5
                              ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isUp ? '+' : ''}{roi}%
                            </span>
                            <span className={`text-[10px] block font-bold ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isUp ? '+' : ''}{formatINR(profit)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 border-l border-slate-100 pl-4">
                            <button
                              onClick={() => setViewingId(viewingId === inv._id ? null : inv._id)}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                              title="Details"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleEdit(inv)}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(inv._id)}
                              className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                      </div>

                      {/* Expand details view */}
                      {viewingId === inv._id && (
                        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 animate-in slide-in-from-top-1">
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase">Quantity</span>
                            <span className="font-bold text-slate-800 text-xs">{inv.quantity || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase">Average Price</span>
                            <span className="font-bold text-slate-800 text-xs">{inv.pricePerUnit ? formatINR(inv.pricePerUnit) : 'N/A'}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase">Expected return</span>
                            <span className="font-bold text-slate-800 text-xs">{inv.expectedReturnPercentage ? `${inv.expectedReturnPercentage}%` : 'N/A'}</span>
                          </div>
                          {inv.description && (
                            <div className="col-span-2 sm:col-span-1">
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">Notes</span>
                              <span className="font-semibold text-slate-500 text-xs italic">"{inv.description}"</span>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  )
                })
              )}
            </div>
          </div>

        </div>

        {/* Right 1 Col: Watchlist, Trending Moers, Financial News */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Watchlist card */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Star className="text-amber-500 fill-amber-500" size={16} />
                Watchlist Feed
              </h2>
              <button 
                onClick={fetchWatchlist}
                className="text-slate-400 hover:text-indigo-600 p-1 rounded-full transition-all"
                title="Refresh prices"
              >
                <RefreshCw size={14} className={watchlistLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Simple inline watch search */}
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Lookup stock to watch..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              {/* Floating dropdown results */}
              {searchResults.length > 0 && (
                <div className="absolute left-4 right-4 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {searchResults.map((item) => (
                    <div 
                      key={item.symbol}
                      onClick={() => handleAddToWatchlist(item.symbol, item.companyName, item.market)}
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex justify-between items-center text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{item.symbol}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{item.companyName}</div>
                      </div>
                      <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded">+ Watch</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* List */}
            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {watchlist.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Watchlist is empty. Search symbols above.
                </div>
              ) : (
                watchlist.map((item) => {
                  const isUp = (item.changePercent || 0) >= 0;
                  return (
                    <div key={item._id} className="p-3 flex justify-between items-center hover:bg-slate-50/50">
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-xs">{item.symbol}</span>
                          <span className="text-[8px] font-extrabold text-slate-400 uppercase">{item.market}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">{item.companyName}</div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <span className="font-black text-slate-900 text-xs">{item.currentPrice ? `$${item.currentPrice.toFixed(2)}` : 'N/A'}</span>
                          {item.changePercent !== null && (
                            <span className={`flex items-center justify-end gap-0.5 text-[9px] font-bold mt-0.5
                              ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isUp ? '+' : ''}{item.changePercent.toFixed(2)}%
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveFromWatchlist(item._id)}
                          className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Movers / Trending card */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <TrendingUp size={16} className="text-purple-600" />
                Market Top Movers
              </h2>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Gainers */}
              <div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider block w-max mb-2">Gainers</span>
                <div className="space-y-1.5">
                  {trending.gainers?.slice(0, 3).map((item) => (
                    <div key={item.symbol} className="flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-950">{item.symbol}</span>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900">${item.price?.toFixed(2)}</span>
                        <span className="text-emerald-600 font-extrabold flex items-center justify-end gap-0.5 text-[9px] mt-0.5">
                          <ArrowUp size={8} />+{item.changePercent?.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Losers */}
              <div>
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded uppercase tracking-wider block w-max mb-2">Losers</span>
                <div className="space-y-1.5">
                  {trending.losers?.slice(0, 3).map((item) => (
                    <div key={item.symbol} className="flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-950">{item.symbol}</span>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900">${item.price?.toFixed(2)}</span>
                        <span className="text-rose-600 font-extrabold flex items-center justify-end gap-0.5 text-[9px] mt-0.5">
                          <ArrowDown size={8} />{item.changePercent?.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Market News Feed */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Newspaper size={16} className="text-blue-600" />
                Market Intelligence News
              </h2>
              <button onClick={fetchNews} className="text-slate-400 hover:text-blue-600">
                <RefreshCw size={12} className={newsLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="p-4 divide-y divide-slate-100 max-h-[350px] overflow-y-auto space-y-3">
              {news.length === 0 ? (
                <div className="text-center text-slate-400 text-xs py-8">No general news available.</div>
              ) : (
                news.map((item) => (
                  <div key={item.id} className="pt-3 first:pt-0 group">
                    <span className="text-[9px] font-bold text-indigo-500 uppercase">{item.source} • {new Date(item.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-bold text-slate-900 text-xs hover:text-blue-600 transition-colors block mt-1 leading-snug"
                    >
                      {item.headline}
                      <ExternalLink size={10} className="inline ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 font-medium leading-relaxed">{item.summary}</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Asset Create/Edit Form Modal */}
      {showForm && (
        <Modal 
          onClose={resetForm} 
          title={editingId ? 'Edit Asset Holding' : 'Add Asset Holding'}
        >
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Asset Class Grid */}
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Asset Class / Type</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {['stocks', 'mutual_funds', 'crypto', 'bonds', 'real_estate', 'other'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleChange({ target: { name: 'type', value: type } })}
                        className={`p-3 rounded-xl border text-sm font-semibold transition-all ${
                          formData.type === type
                            ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm ring-1 ring-blue-500'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {getTypeLabel(type)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name & Date */}
                <div className="space-y-2 relative">
                  <label className="text-sm font-semibold text-slate-700">Asset / Ticker Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder={formData.type === 'real_estate' ? 'e.g. Apartment Downtown' : "e.g. AAPL, BTC, Tata Motors"}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-sm font-medium"
                    required
                    autoComplete="off"
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto mt-1 divide-y divide-slate-50">
                      {suggestions.map((item, idx) => (
                        <li 
                          key={idx}
                          onClick={() => {
                            selectSuggestion(item);
                            setShowSuggestions(false);
                          }}
                          className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex justify-between items-center text-xs font-semibold"
                        >
                          <div>
                            <span className="text-slate-900 block font-bold">{item.companyName}</span>
                            <span className="text-slate-400 uppercase text-[10px]">{item.symbol} • {item.market}</span>
                          </div>
                          <Plus size={14} className="text-blue-500" />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Acquisition Date</label>
                  <input
                    type="date"
                    name="investmentDate"
                    value={formData.investmentDate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-600 text-sm font-medium"
                    required
                  />
                </div>

                {/* Capital & Current */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Initial Cost / Invested Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-700">Current Market Value (₹)</label>
                    {formData.type === 'stocks' && (
                      <button
                        type="button"
                        onClick={() => handleRefreshStockPrice()}
                        disabled={livePriceInfo.loading}
                        className="text-xs text-blue-600 hover:text-blue-850 active:scale-95 font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                      >
                        <RefreshCw size={12} className={livePriceInfo.loading ? 'animate-spin' : ''} />
                        Refresh Price
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      name="currentValue"
                      value={formData.currentValue}
                      onChange={handleChange}
                      placeholder="0.00"
                      className={`w-full pl-8 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium ${
                        formData.type === 'stocks'
                          ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-205'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                      required
                      readOnly={formData.type === 'stocks'}
                    />
                  </div>
                  {formData.type === 'stocks' && (
                    <div className="mt-1.5 text-xs space-y-1">
                      {livePriceInfo.price !== null && (
                        <div className="flex justify-between text-slate-550 font-bold bg-blue-50/50 p-2 rounded-lg border border-blue-100/50">
                          <span>Current Price: ₹{livePriceInfo.price}</span>
                          <span>Last Updated: {livePriceInfo.lastUpdated}</span>
                          <span>Source: Yahoo Finance ({livePriceInfo.exchange})</span>
                        </div>
                      )}
                      {livePriceInfo.error && (
                        <div className="text-rose-600 font-bold bg-rose-50 p-2 rounded-lg border border-rose-100">
                          {livePriceInfo.error}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Conditional details */}
                {['stocks', 'mutual_funds', 'crypto'].includes(formData.type) && (
                  <div className="md:col-span-2 grid grid-cols-3 gap-4 border-t border-slate-100 pt-4 animate-in slide-in-from-top-1">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-600">Quantity / Units</label>
                      <input
                        type="number"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-600">Average price per Unit (₹)</label>
                      <input
                        type="number"
                        name="pricePerUnit"
                        value={formData.pricePerUnit}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-600">Exchange / Platform</label>
                      <input
                        type="text"
                        name="broker"
                        value={formData.broker}
                        placeholder="e.g. Groww, Zerodha"
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                )}



                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Risk Profile</label>
                  <select
                    name="riskLevel"
                    value={formData.riskLevel}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-semibold"
                  >
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Risk</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Expected CAGR (%)</label>
                  <input
                    type="number"
                    name="expectedReturnPercentage"
                    value={formData.expectedReturnPercentage}
                    onChange={handleChange}
                    placeholder="e.g. 12"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Notes / Strategy description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="2"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm placeholder:text-slate-400 font-medium"
                  />
                </div>

                {/* Family share options */}
                {familyGroups.length > 0 && (
                  <div className="md:col-span-2 border-t border-slate-100 pt-4 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Associate with Family Group</label>
                      <select
                        name="familyGroupId"
                        value={formData.familyGroupId}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-semibold"
                      >
                        <option value="">Personal Investment (No Group)</option>
                        {familyGroups.map(g => (
                          <option key={g._id} value={g._id}>{g.name}</option>
                        ))}
                      </select>
                    </div>

                    {!formData.familyGroupId && (
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/40">
                        <input 
                          type="checkbox"
                          id="familySyncInput"
                          checked={formData.familySyncEnabled}
                          onChange={(e) => setFormData(p => ({ ...p, familySyncEnabled: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="familySyncInput" className="text-xs font-bold text-slate-700 cursor-pointer">
                          Sync details to family hub summary (Respect privacy configuration)
                        </label>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Form buttons */}
              <div className="flex gap-4 border-t border-slate-100 pt-6 mt-6">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all text-sm transform active:scale-95"
                >
                  {editingId ? 'Save Changes' : 'Add Asset'}
                </button>
              </div>

            </form>
        </Modal>
      )}
        </>
      )}

    </div>
  )
}
