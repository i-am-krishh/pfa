import { useState, useEffect } from 'react'
import axios from 'axios'
import { TrendingUp, Plus, Trash2, Edit2, Eye } from 'lucide-react'

export default function Investment() {
  const [investments, setInvestments] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [viewingId, setViewingId] = useState(null)
  const [totalInvested, setTotalInvested] = useState(0)
  const [totalCurrentValue, setTotalCurrentValue] = useState(0)

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

  const token = localStorage.getItem('token')

  const fetchInvestments = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/investment', {
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
        quantity: parseFloat(formData.quantity),
        pricePerUnit: parseFloat(formData.pricePerUnit),
        expectedReturnPercentage: parseFloat(formData.expectedReturnPercentage)
      }

      if (editingId) {
        await axios.put(`http://localhost:5000/api/investment/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else {
        await axios.post('http://localhost:5000/api/investment', payload, {
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
        await axios.delete(`http://localhost:5000/api/investment/${id}`, {
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
      case 'low': return 'text-green-400'
      case 'medium': return 'text-yellow-400'
      case 'high': return 'text-red-400'
      default: return 'text-gray-400'
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

  const investmentDetail = investments.find(inv => inv._id === viewingId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="text-blue-400" size={32} />
            Investment Portfolio
          </h1>
          <p className="text-gray-400 mt-1">Track and manage your investments</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          <Plus size={20} />
          Add Investment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-700/30 rounded-lg p-6">
          <p className="text-gray-400 text-sm">Total Invested</p>
          <p className="text-2xl font-bold text-blue-400 mt-2">₹{totalInvested.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-700/30 rounded-lg p-6">
          <p className="text-gray-400 text-sm">Current Value</p>
          <p className="text-2xl font-bold text-purple-400 mt-2">₹{totalCurrentValue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className={`bg-gradient-to-br ${totalCurrentValue >= totalInvested ? 'from-green-900/30 to-green-800/20' : 'from-red-900/30 to-red-800/20'} border ${totalCurrentValue >= totalInvested ? 'border-green-700/30' : 'border-red-700/30'} rounded-lg p-6`}>
          <p className="text-gray-400 text-sm">Profit/Loss</p>
          <p className={`text-2xl font-bold mt-2 ${totalCurrentValue >= totalInvested ? 'text-green-400' : 'text-red-400'}`}>
            ₹{(totalCurrentValue - totalInvested).toLocaleString('en-IN', {minimumFractionDigits: 2})}
          </p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            {editingId ? 'Edit Investment' : 'Add New Investment'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="stocks">Stocks</option>
                  <option value="mutual_funds">Mutual Funds</option>
                  <option value="crypto">Cryptocurrency</option>
                  <option value="bonds">Bonds</option>
                  <option value="real_estate">Real Estate</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Investment Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., RELIANCE Stocks"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Initial Investment Amount (₹)</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* Current Value */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Current Value (₹)</label>
                <input
                  type="number"
                  name="currentValue"
                  value={formData.currentValue}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Quantity</label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  placeholder="1"
                  step="0.01"
                  min="0"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Price Per Unit */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Price Per Unit (₹)</label>
                <input
                  type="number"
                  name="pricePerUnit"
                  value={formData.pricePerUnit}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Investment Date */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Investment Date</label>
                <input
                  type="date"
                  name="investmentDate"
                  value={formData.investmentDate}
                  onChange={handleChange}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* Expected Return */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Expected Return (%)</label>
                <input
                  type="number"
                  name="expectedReturnPercentage"
                  value={formData.expectedReturnPercentage}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Risk Level */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Risk Level</label>
                <select
                  name="riskLevel"
                  value={formData.riskLevel}
                  onChange={handleChange}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              {/* Broker */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Broker/Platform</label>
                <input
                  type="text"
                  name="broker"
                  value={formData.broker}
                  onChange={handleChange}
                  placeholder="e.g., NSE, Zerodha"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description (Optional)</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Add notes about this investment..."
                rows="3"
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              ></textarea>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition font-medium"
              >
                {editingId ? 'Update Investment' : 'Add Investment'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Investments List */}
      <div className="space-y-4">
        {investments.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/50 border border-slate-700 rounded-lg">
            <TrendingUp size={40} className="mx-auto text-gray-500 mb-3" />
            <p className="text-gray-400">No investments yet. Start building your portfolio!</p>
          </div>
        ) : (
          investments.map((inv) => (
            <div key={inv._id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-white">{inv.name}</h3>
                    <span className="text-xs px-2 py-1 bg-blue-900/50 text-blue-300 rounded-full">
                      {getTypeLabel(inv.type)}
                    </span>
                    <span className={`text-xs px-2 py-1 bg-slate-700 rounded-full ${getRiskColor(inv.riskLevel)}`}>
                      {inv.riskLevel.charAt(0).toUpperCase() + inv.riskLevel.slice(1)} Risk
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mt-1">{inv.broker && `Broker: ${inv.broker}`}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewingId(viewingId === inv._id ? null : inv._id)}
                    className="p-2 bg-blue-900/50 hover:bg-blue-800 text-blue-400 rounded transition"
                    title="View details"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => handleEdit(inv)}
                    className="p-2 bg-purple-900/50 hover:bg-purple-800 text-purple-400 rounded transition"
                    title="Edit"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(inv._id)}
                    className="p-2 bg-red-900/50 hover:bg-red-800 text-red-400 rounded transition"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Investment Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <p className="text-gray-400 text-xs">Initial Investment</p>
                  <p className="text-white font-semibold">₹{inv.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Current Value</p>
                  <p className="text-white font-semibold">₹{inv.currentValue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Profit/Loss</p>
                  <p className={`font-semibold ${calculateProfit(inv) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ₹{calculateProfit(inv).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">ROI</p>
                  <p className={`font-semibold ${calculateROI(inv) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {calculateROI(inv)}%
                  </p>
                </div>
              </div>

              {/* Expanded View */}
              {viewingId === inv._id && (
                <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {inv.quantity && (
                      <div>
                        <p className="text-gray-400 text-sm">Quantity</p>
                        <p className="text-white font-semibold">{inv.quantity} units</p>
                      </div>
                    )}
                    {inv.pricePerUnit && (
                      <div>
                        <p className="text-gray-400 text-sm">Price Per Unit</p>
                        <p className="text-white font-semibold">₹{inv.pricePerUnit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-400 text-sm">Investment Date</p>
                      <p className="text-white font-semibold">{new Date(inv.investmentDate).toLocaleDateString()}</p>
                    </div>
                    {inv.expectedReturnPercentage > 0 && (
                      <div>
                        <p className="text-gray-400 text-sm">Expected Return</p>
                        <p className="text-white font-semibold">{inv.expectedReturnPercentage}%</p>
                      </div>
                    )}
                  </div>
                  {inv.description && (
                    <div>
                      <p className="text-gray-400 text-sm">Notes</p>
                      <p className="text-white">{inv.description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
