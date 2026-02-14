import { useState, useEffect } from 'react'
import axios from 'axios'
import { TrendingUp, Plus, Trash2, Edit2, Eye, TrendingDown, Wallet, PieChart, Activity, Search } from 'lucide-react'
import Modal from '../components/Modal'
import { getTrendingStocks, getMutualFunds } from '../services/stockApi'

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function Investment() {
  const [investments, setInvestments] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [viewingId, setViewingId] = useState(null)
  const [totalInvested, setTotalInvested] = useState(0)
  const [totalCurrentValue, setTotalCurrentValue] = useState(0)

  const [suggestions, setSuggestions] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [formData, setFormData] = useState({
    type: 'stocks',
    name: '',
    amount: '',
    currentValue: '',
    quantity: '',
    pricePerUnit: '',
    investmentDate: new Date().toISOString().split('T')[0],
    expectedReturnPercentage: '',
    riskLevel: 'medium',
    broker: '',
    description: ''
  })

  // Debounced search for stocks
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (['stocks', 'mutual_funds'].includes(formData.type) && formData.name.length > 2) {
        setIsSearching(true)
        try {
          const fetcher = formData.type === 'mutual_funds' ? getMutualFunds : getTrendingStocks;
          const response = await fetcher();
          const data = response.data.data || response.data || [];
          
          const matches = Array.isArray(data) ? data.filter(item => 
            (item.companyName || item.name || '').toLowerCase().includes(formData.name.toLowerCase()) ||
            (item.symbol || '').toLowerCase().includes(formData.name.toLowerCase())
          ).slice(0, 5) : [];
          
          setSuggestions(matches);
        } catch (error) {
          console.error("Failed to fetch suggestions", error);
        } finally {
          setIsSearching(false)
        }
      } else {
        setSuggestions([])
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [formData.name, formData.type])

  const selectSuggestion = (item) => {
    setFormData(prev => ({
      ...prev,
      name: item.companyName || item.name || item.symbol,
      // If price is available in the suggestion, use it
      currentValue: item.currentPrice ? (parseFloat(item.currentPrice) * (prev.quantity || 1)).toFixed(2) : prev.currentValue,
      pricePerUnit: item.currentPrice || prev.pricePerUnit
    }))
    setSuggestions([])
  }

  const token = localStorage.getItem('token')

  const fetchInvestments = async () => {
    try {
      const response = await axios.get(`${API_URL}/investment`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setInvestments(response.data.investments)
      setTotalInvested(response.data.totalInvested)
      setTotalCurrentValue(response.data.totalCurrentValue)
    } catch (error) {
      console.error('Error fetching investments:', error)
    }
  }

  useEffect(() => {
    fetchInvestments()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'name') setShowSuggestions(true)
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
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
        expectedReturnPercentage: formData.expectedReturnPercentage ? parseFloat(formData.expectedReturnPercentage) : 0
      }

      if (editingId) {
        await axios.put(`${API_URL}/investment/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else {
        await axios.post(`${API_URL}/investment`, payload, {
          headers: { Authorization: `Bearer ${token}` }
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
      amount: investment.amount,
      currentValue: investment.currentValue,
      quantity: investment.quantity,
      pricePerUnit: investment.pricePerUnit,
      investmentDate: investment.investmentDate.split('T')[0],
      expectedReturnPercentage: investment.expectedReturnPercentage,
      riskLevel: investment.riskLevel,
      broker: investment.broker,
      description: investment.description
    })
    setEditingId(investment._id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this investment?')) {
      try {
        await axios.delete(`${API_URL}/investment/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
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
      amount: '',
      currentValue: '',
      quantity: '',
      pricePerUnit: '',
      investmentDate: new Date().toISOString().split('T')[0],
      expectedReturnPercentage: '',
      riskLevel: 'medium',
      broker: '',
      description: ''
    })
    setEditingId(null)
    setShowForm(false)
  }

  const calculateProfit = (inv) => {
    return inv.currentValue - inv.amount
  }

  const calculateROI = (inv) => {
    if (inv.amount === 0) return 0
    return ((inv.currentValue - inv.amount) / inv.amount * 100).toFixed(2)
  }

  const getRiskColor = (risk) => {
    switch(risk) {
      case 'low': return 'text-green-400 bg-green-400/10 border-green-400/20'
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
      case 'high': return 'text-red-400 bg-red-400/10 border-red-400/20'
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20'
    }
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

  const profitLoss = totalCurrentValue - totalInvested
  const isProfitable = profitLoss >= 0

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
             <div className="p-2 bg-blue-100/50 rounded-xl">
               <TrendingUp className="text-blue-600" size={32} />
             </div>
             Investment Portfolio
          </h1>
          <p className="text-slate-500 text-lg">Manage your assets and track performance</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="group flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-6 py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 font-semibold"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          New Investment
        </button>
      </div>

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
             <Wallet size={80} className="text-blue-600" />
          </div>
          <div className="relative z-10">
             <p className="text-slate-500 font-medium mb-2 flex items-center gap-2">
               <Wallet size={16} /> Total Invested
             </p>
             <h3 className="text-3xl font-bold text-slate-900">
               ₹{totalInvested.toLocaleString('en-IN', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
             </h3>
             <p className="text-slate-400 text-xs mt-2">Initial capital inputs</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
             <PieChart size={80} className="text-purple-600" />
          </div>
          <div className="relative z-10">
             <p className="text-slate-500 font-medium mb-2 flex items-center gap-2">
               <Activity size={16} /> Current Value
             </p>
             <h3 className="text-3xl font-bold text-slate-900">
               ₹{totalCurrentValue.toLocaleString('en-IN', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
             </h3>
             <p className="text-slate-400 text-xs mt-2">Market value today</p>
          </div>
        </div>

        <div className={`rounded-2xl p-6 shadow-lg relative overflow-hidden group transition-colors duration-300 ${isProfitable ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-green-600/20' : 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-red-600/20'}`}>
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform duration-500">
             {isProfitable ? <TrendingUp size={80} /> : <TrendingDown size={80} />}
          </div>
          <div className="relative z-10">
             <p className="font-medium mb-2 opacity-90 flex items-center gap-2">
               Total Profit/Loss
             </p>
             <h3 className="text-3xl font-bold flex items-center gap-2">
               {isProfitable ? '+' : ''}₹{Math.abs(profitLoss).toLocaleString('en-IN', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
             </h3>
             <div className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full bg-white/20 text-sm font-medium backdrop-blur-sm">
               {totalInvested > 0 ? ((profitLoss / totalInvested) * 100).toFixed(2) : 0}% Return
             </div>
          </div>
        </div>
      </div>

      {/* Edit/Add Form Modal/Inline */}
      {showForm && (
        <Modal 
          onClose={resetForm} 
          title={editingId ? 'Edit Investment' : 'Add New Asset'}
        >
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Asset Class Selection - Always Visible */}
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Asset Class</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {['stocks', 'mutual_funds', 'crypto', 'bonds', 'real_estate', 'other'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleChange({ target: { name: 'type', value: type } })}
                        className={`p-3 rounded-xl border text-sm font-medium transition-all ${
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

                {/* Common Fields Section */}
                <div className="md:col-span-2 border-t border-slate-100 pt-4">
                  <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 relative">
                  <label className="text-sm font-semibold text-slate-700">
                    {formData.type === 'real_estate' ? 'Property Name' : 'Asset Name'}
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder={formData.type === 'real_estate' ? 'e.g. Apartment in City Center' : "e.g. HDFC Bank, Bitcoin"}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                    required
                    autoComplete="off"
                  />
                  {/* Suggestions Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto mt-1">
                      {suggestions.map((item, index) => (
                        <li 
                          key={index}
                          onClick={() => {
                            selectSuggestion(item);
                            setShowSuggestions(false);
                          }}
                          className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center group transition-colors"
                        >
                          <div>
                            <div className="font-semibold text-slate-800 text-sm">
                              {item.companyName || item.name || item.symbol}
                            </div>
                            <div className="text-xs text-slate-500">
                              {item.symbol} {item.currentPrice ? `• ₹${item.currentPrice}` : ''}
                            </div>
                          </div>
                          <Plus size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Date Invested</label>
                      <input
                        type="date"
                        name="investmentDate"
                        value={formData.investmentDate}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-600"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Financial Details Section */}
                <div className="md:col-span-2 border-t border-slate-100 pt-4">
                   <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="w-1 h-4 bg-green-500 rounded-full"></span>
                    Financials
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Invested Amount (₹)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                        <input
                          type="number"
                          name="amount"
                          value={formData.amount}
                          onChange={handleChange}
                          placeholder="0.00"
                          className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Current Value (₹)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                        <input
                          type="number"
                          name="currentValue"
                          value={formData.currentValue}
                          onChange={handleChange}
                          placeholder="0.00"
                          className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                          required
                        />
                      </div>
                    </div>
                  
                    <div className="space-y-2">
                       <label className="text-sm font-semibold text-slate-700">Expected Return (%)</label>
                       <div className="relative">
                         <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">%</span>
                         <input
                           type="number"
                           name="expectedReturnPercentage"
                           value={formData.expectedReturnPercentage}
                           onChange={handleChange}
                           placeholder="0.00"
                           className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                         />
                       </div>
                    </div>
                  </div>
                </div>

                {/* Conditional Fields based on Asset Class */}
                {['stocks', 'mutual_funds', 'crypto'].includes(formData.type) && (
                  <div className="md:col-span-2 border-t border-slate-100 pt-4 animate-in slide-in-from-top-2">
                    <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
                      Market Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Quantity / Units</label>
                        <input
                          type="number"
                          name="quantity"
                          value={formData.quantity}
                          onChange={handleChange}
                          placeholder="0"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Avg. Price</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                          <input
                            type="number"
                            name="pricePerUnit"
                            value={formData.pricePerUnit}
                            onChange={handleChange}
                            placeholder="0.00"
                            className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                       <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">
                          {formData.type === 'crypto' ? 'Exchange / Wallet' : 'Broker / Platform'}
                        </label>
                        <input
                          type="text"
                          name="broker"
                          value={formData.broker}
                          onChange={handleChange}
                          placeholder={formData.type === 'crypto' ? 'e.g. Binance, MetaMask' : 'e.g. Zerodha, Groww'}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  </div>
                )}

                 {/* Real Estate Specifics */}
                 {formData.type === 'real_estate' && (
                  <div className="md:col-span-2 border-t border-slate-100 pt-4 animate-in slide-in-from-top-2">
                     <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <span className="w-1 h-4 bg-orange-500 rounded-full"></span>
                      Property Details
                    </h3>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Location / Address</label>
                      <input
                        type="text"
                        name="broker" // Reuse broker field for location
                        value={formData.broker}
                        onChange={handleChange}
                        placeholder="e.g. 123 Main St, New York"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                )}

                {/* Additional Info Section */}
                <div className="md:col-span-2 border-t border-slate-100 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Risk Profile</label>
                      <select
                        name="riskLevel"
                        value={formData.riskLevel}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      >
                        <option value="low">Low Risk (Conservative)</option>
                        <option value="medium">Medium Risk (Balanced)</option>
                        <option value="high">High Risk (Aggressive)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                       <label className="text-sm font-semibold text-slate-700">Notes & Strategy</label>
                       <textarea
                         name="description"
                         value={formData.description}
                         onChange={handleChange}
                         rows="1"
                         className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                         placeholder="Optional notes..."
                       ></textarea>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 transition-all transform active:scale-95"
                >
                  {editingId ? 'Save Changes' : 'Create Asset'}
                </button>
              </div>
            </form>
        </Modal>
      )}

      {/* Assets Grid */}
      <div className="grid grid-cols-1 gap-6">
        {investments.length === 0 ? (
          <div className="text-center py-16 bg-white border border-dashed border-slate-300 rounded-3xl">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
               <TrendingUp size={32} className="text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-1">No Investments Found</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              Start building your wealth by adding your first investment asset.
            </p>
            <button
              onClick={() => {
                resetForm()
                setShowForm(true)
              }}
              className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
            >
              Add Your First Asset
            </button>
          </div>
        ) : (
          investments.map((inv) => {
             const profit = calculateProfit(inv)
             const roi = calculateROI(inv)
             const isProfitable = profit >= 0
             
             return (
               <div key={inv._id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
                 <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
                   
                   {/* Left: Basic Info */}
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-3 mb-2">
                       <h3 className="text-lg font-bold text-slate-900 truncate">{inv.name}</h3>
                       <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 uppercase tracking-wide">
                         {getTypeLabel(inv.type)}
                       </span>
                       <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${getRiskColor(inv.riskLevel)}`}>
                         {inv.riskLevel} Risk
                       </span>
                     </div>
                     <div className="flex items-center gap-4 text-sm text-slate-500">
                        {inv.broker && <div className="flex items-center gap-1.5"><Wallet size={14}/> {inv.broker}</div>}
                        <div className="flex items-center gap-1.5"><Activity size={14}/> {new Date(inv.investmentDate).toLocaleDateString()}</div>
                     </div>
                   </div>

                   {/* Middle: Stats */}
                   <div className="flex flex-wrap items-center gap-8 md:px-8 md:border-l md:border-r border-slate-100">
                      <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Invested</p>
                        <p className="font-bold text-slate-900">₹{inv.amount.toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Current</p>
                        <p className="font-bold text-slate-900">₹{inv.currentValue.toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Return</p>
                        <div className={`font-bold flex items-center gap-1 ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                           {isProfitable ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                           {roi}% <span className="text-xs opacity-80">(₹{Math.abs(profit).toLocaleString('en-IN')})</span>
                        </div>
                      </div>
                   </div>

                   {/* Right: Actions */}
                   <div className="flex items-center gap-2 self-start md:self-center">
                      <button
                        onClick={() => setViewingId(viewingId === inv._id ? null : inv._id)}
                        className={`p-2 rounded-lg transition-colors ${viewingId === inv._id ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}
                        title="Expand Details"
                      >
                         <Eye size={20} />
                      </button>
                      <button
                        onClick={() => handleEdit(inv)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-blue-600"
                        title="Edit"
                      >
                         <Edit2 size={20} />
                      </button>
                      <button
                        onClick={() => handleDelete(inv._id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors text-slate-400 hover:text-red-500"
                        title="Delete"
                      >
                         <Trash2 size={20} />
                      </button>
                   </div>
                 </div>

                 {/* Expanded Details */}
                 {viewingId === inv._id && (
                   <div className="mt-6 pt-6 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                           <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Unit Details</p>
                           <div className="space-y-2 text-sm">
                             <div className="flex justify-between">
                                <span className="text-slate-500">Quantity</span>
                                <span className="font-medium text-slate-900">{inv.quantity || 'N/A'}</span>
                             </div>
                             <div className="flex justify-between">
                                <span className="text-slate-500">Avg. Buy Price</span>
                                <span className="font-medium text-slate-900">{inv.pricePerUnit ? `₹${inv.pricePerUnit}` : 'N/A'}</span>
                             </div>
                           </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                           <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Performance</p>
                           <div className="space-y-2 text-sm">
                             <div className="flex justify-between">
                                <span className="text-slate-500">Absolute Return</span>
                                <span className={`font-medium ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                                  {isProfitable ? '+' : ''}₹{Math.abs(profit).toLocaleString('en-IN')}
                                </span>
                             </div>
                             <div className="flex justify-between">
                                <span className="text-slate-500">Expected CAGR</span>
                                <span className="font-medium text-slate-900">{inv.expectedReturnPercentage ? `${inv.expectedReturnPercentage}%` : 'N/A'}</span>
                             </div>
                           </div>
                        </div>

                        {(inv.description) && (
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 md:col-span-1">
                             <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Notes & Strategy</p>
                             <p className="text-sm text-slate-600 leading-relaxed italic">
                               "{inv.description}"
                             </p>
                          </div>
                        )}
                     </div>
                   </div>
                 )}
               </div>
             )
          })
        )}
      </div>
    </div>
  )
}
