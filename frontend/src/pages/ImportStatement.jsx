import { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  Upload, Calendar, FileText, CheckCircle2, AlertTriangle, 
  Loader2, Sparkles, Clock, Check, Trash2, Edit3, ArrowRight,
  TrendingUp, ShoppingBag, PieChart as PieIcon, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import { 
  ResponsiveContainer, PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend 
} from 'recharts'

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const CATEGORIES = [
  'Food', 'Travel', 'Shopping', 'Healthcare', 'Bills', 
  'Education', 'Entertainment', 'Investment', 'EMI', 'Utilities', 'Other'
];

const COLORS = [
  '#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', 
  '#ec4899', '#14b8a6', '#f97316', '#64748b', '#a855f7', '#06b6d4'
];

export default function ImportStatement() {
  const [activeTab, setActiveTab] = useState('import')
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  // Staging data
  const [currentUpload, setCurrentUpload] = useState(null)
  const [stagedTransactions, setStagedTransactions] = useState([])
  const [selectedTxnIds, setSelectedTxnIds] = useState([])
  const [uploadAnalytics, setUploadAnalytics] = useState(null)

  // History & Insights
  const [history, setHistory] = useState([])
  const [insights, setInsights] = useState([])
  const [recurring, setRecurring] = useState([])
  const [isInsightsLoading, setIsInsightsLoading] = useState(false)

  const token = localStorage.getItem('token')

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/statement/history`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setHistory(response.data.history || [])
    } catch (error) {
      console.error('Error fetching history:', error)
    }
  }

  const fetchInsights = async () => {
    setIsInsightsLoading(true)
    try {
      const response = await axios.get(`${API_URL}/statement/insights`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setInsights(response.data.insights || [])
      setRecurring(response.data.recurringPayments || [])
    } catch (error) {
      console.error('Error fetching insights:', error)
    } finally {
      setIsInsightsLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
    fetchInsights()
  }, [])

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      validateAndSetFile(droppedFile)
    }
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      validateAndSetFile(selectedFile)
    }
  }

  const validateAndSetFile = (file) => {
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['pdf', 'csv', 'xlsx', 'xls', 'jpg', 'jpeg', 'png'].includes(ext)) {
      alert('Only PDF, CSV, Excel spreadsheets, and Images (JPG/PNG) are supported!')
      return
    }
    setFile(file)
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return

    setIsUploading(true)
    setUploadProgress(10)
    
    const formData = new FormData()
    formData.append('file', file)

    try {
      setUploadProgress(40)
      const response = await axios.post(`${API_URL}/statement/upload`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })
      
      setUploadProgress(100)
      setTimeout(() => {
        setCurrentUpload(response.data.upload)
        setStagedTransactions(response.data.transactions || [])
        setUploadAnalytics(response.data.analytics || null)
        // Select all non-duplicate transactions by default
        const nonDuplicates = response.data.transactions
          ?.filter(t => !t.isDuplicate)
          ?.map(t => t._id) || []
        setSelectedTxnIds(nonDuplicates)
        setIsUploading(false)
        setFile(null)
      }, 500)

    } catch (error) {
      console.error('Upload failed:', error)
      alert(error.response?.data?.message || 'Failed to process statement upload')
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedTxnIds(stagedTransactions.map(t => t._id))
    } else {
      setSelectedTxnIds([])
    }
  }

  const handleToggleSelect = (id) => {
    if (selectedTxnIds.includes(id)) {
      setSelectedTxnIds(prev => prev.filter(i => i !== id))
    } else {
      setSelectedTxnIds(prev => [...prev, id])
    }
  }

  const handleCategoryChange = async (txnId, newCategory) => {
    try {
      const response = await axios.put(`${API_URL}/statement/staging/${txnId}`, 
        { category: newCategory },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      // Update local state
      setStagedTransactions(prev => prev.map(t => 
        t._id === txnId ? { ...t, category: response.data.record.category } : t
      ))
    } catch (error) {
      console.error('Error updating category:', error)
    }
  }

  const handleConfirmImport = async () => {
    if (selectedTxnIds.length === 0) {
      alert('Please select at least one transaction to import!')
      return
    }

    try {
      const response = await axios.post(`${API_URL}/statement/confirm/${currentUpload._id}`, {
        selectedTransactionIds: selectedTxnIds
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      alert(response.data.message)
      setCurrentUpload(null)
      setStagedTransactions([])
      setSelectedTxnIds([])
      setUploadAnalytics(null)
      
      // Refresh summaries
      fetchHistory()
      fetchInsights()
      
      // Dispatch paid event to trigger header refresh
      window.dispatchEvent(new Event('emiPaid'))
    } catch (error) {
      console.error('Error importing transactions:', error)
      alert(error.response?.data?.message || 'Failed to import transactions')
    }
  }

  const handleExportCSV = async () => {
    if (!currentUpload) return
    try {
      const response = await axios.get(`${API_URL}/statement/export/${currentUpload._id}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `statement_${currentUpload.fileName.split('.')[0]}_export.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('CSV export failed:', error)
      alert('Failed to export CSV')
    }
  }

  // Pre-calculate charts data from selected staging transactions or history
  const getStagingExpenseBreakdown = () => {
    const map = {}
    stagedTransactions.forEach(t => {
      if (t.type === 'expense' && selectedTxnIds.includes(t._id)) {
        map[t.category] = (map[t.category] || 0) + t.amount
      }
    })
    return Object.keys(map).map((cat, idx) => ({
      name: cat,
      value: map[cat],
      color: COLORS[idx % COLORS.length]
    }))
  }

  const getStagingTotalIncome = () => {
    return stagedTransactions
      .filter(t => t.type === 'income' && selectedTxnIds.includes(t._id))
      .reduce((sum, t) => sum + t.amount, 0)
  }

  const getStagingTotalExpense = () => {
    return stagedTransactions
      .filter(t => t.type === 'expense' && selectedTxnIds.includes(t._id))
      .reduce((sum, t) => sum + t.amount, 0)
  }

  const renderImportTab = () => {
    // 1. Show staging transaction editor if upload is completed
    if (currentUpload && stagedTransactions.length > 0) {
      const totalIncome = getStagingTotalIncome()
      const totalExpense = getStagingTotalExpense()
      const chartData = getStagingExpenseBreakdown()

      return (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="text-blue-500" /> Review Statement Transactions
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                Statement: <span className="font-semibold text-slate-700">{currentUpload.fileName}</span> ({currentUpload.totalTransactions} extracted)
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleExportCSV}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-semibold border border-slate-200 transition-all flex items-center gap-2"
              >
                Export CSV
              </button>
              <button
                onClick={() => {
                  setCurrentUpload(null)
                  setStagedTransactions([])
                  setUploadAnalytics(null)
                }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/25 transition-all flex items-center gap-2"
              >
                <Check size={18} /> Confirm Import ({selectedTxnIds.length})
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Income Selected</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">₹{totalIncome.toLocaleString('en-IN')}</h3>
              </div>
              <div className="p-3 bg-green-50 rounded-xl text-green-600"><ArrowUpRight size={24} /></div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Expenses Selected</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">₹{totalExpense.toLocaleString('en-IN')}</h3>
              </div>
              <div className="p-3 bg-red-50 rounded-xl text-red-600"><ArrowDownRight size={24} /></div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Net Contribution</p>
                <h3 className={`text-2xl font-bold mt-1 ${totalIncome - totalExpense >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  ₹{(totalIncome - totalExpense).toLocaleString('en-IN')}
                </h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><TrendingUp size={24} /></div>
            </div>
          </div>

          {/* Statement Analytics Summary */}
          {uploadAnalytics && (
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-6">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="text-purple-600 fill-purple-100" size={18} /> Parsed Statement Analytics Summary
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Top Categories */}
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">Top Spending Categories</h4>
                  {uploadAnalytics.topCategories && uploadAnalytics.topCategories.length > 0 ? (
                    <div className="space-y-2">
                      {uploadAnalytics.topCategories.slice(0, 3).map((c, i) => (
                        <div key={i} className="flex justify-between items-center text-sm font-sans">
                          <span className="text-slate-600 font-medium">{c.category}</span>
                          <span className="font-bold text-slate-800">₹{c.amount.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic font-sans">No spending categories found.</p>
                  )}
                </div>

                {/* Largest Expenses */}
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">Largest Expenses</h4>
                  {uploadAnalytics.largestExpenses && uploadAnalytics.largestExpenses.length > 0 ? (
                    <div className="space-y-2">
                      {uploadAnalytics.largestExpenses.slice(0, 3).map((e, i) => (
                        <div key={i} className="flex justify-between items-center text-sm gap-2 font-sans">
                          <span className="text-slate-600 truncate font-medium flex-1">{e.description}</span>
                          <span className="font-bold text-slate-800">₹{e.amount.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic font-sans">No expenses found.</p>
                  )}
                </div>

                {/* Recurring Bills */}
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">Recurring Patterns</h4>
                  {uploadAnalytics.recurringPayments && uploadAnalytics.recurringPayments.length > 0 ? (
                    <div className="space-y-2">
                      {uploadAnalytics.recurringPayments.slice(0, 3).map((r, i) => (
                        <div key={i} className="flex justify-between items-center text-sm gap-2 font-sans">
                          <span className="text-slate-600 truncate font-medium flex-1">{r.description}</span>
                          <span className="font-bold text-slate-800">₹{r.amount.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic font-sans">No recurring items detected.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Review Grid & Preview Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Table */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Transactions List</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="selectAll"
                    checked={selectedTxnIds.length === stagedTransactions.length}
                    onChange={handleSelectAll}
                    className="w-4.5 h-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="selectAll" className="text-xs font-bold text-slate-500 cursor-pointer">SELECT ALL</label>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[60vh]">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-left text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                      <th className="p-4 w-12 text-center">Include</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Description</th>
                      <th className="p-4">Category</th>
                      <th className="p-4 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stagedTransactions.map(txn => (
                      <tr key={txn._id} className={`hover:bg-slate-50/50 transition-colors ${txn.isDuplicate ? 'bg-amber-50/20' : ''}`}>
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedTxnIds.includes(txn._id)}
                            onChange={() => handleToggleSelect(txn._id)}
                            className="w-4.5 h-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="p-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                          {new Date(txn.date).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <div className="text-sm font-semibold text-slate-800 break-all">{txn.description}</div>
                          <div className="flex gap-2 mt-1.5 items-center">
                            <span className="text-[10px] text-slate-400 capitalize">{txn.bankName}</span>
                            {txn.isDuplicate && (
                              <span className="flex items-center gap-0.5 text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                                <AlertTriangle size={8} /> DUPLICATE
                              </span>
                            )}
                            {txn.aiConfidence > 0.8 && (
                              <span className="text-[9px] font-bold bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded border border-purple-100">
                                AI Verified
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <select
                            value={txn.category}
                            onChange={(e) => handleCategoryChange(txn._id, e.target.value)}
                            className="text-xs font-semibold px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-700 font-sans"
                          >
                            {CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-4 text-right">
                          <span className={`text-sm font-bold ${txn.type === 'income' ? 'text-green-600' : 'text-slate-800'}`}>
                            {txn.type === 'income' ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Staging Chart summary */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col h-full self-start">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <PieIcon size={18} className="text-purple-500" /> Staged Expense Allocation
              </h3>

              {chartData.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-slate-400">
                  <PieIcon size={48} className="text-slate-200 mb-2" />
                  <p className="text-sm">No expenses selected</p>
                </div>
              ) : (
                <div className="space-y-6 flex-1 flex flex-col justify-center">
                  <div className="h-60 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Outgoings</span>
                      <span className="text-xl font-bold text-slate-800">₹{totalExpense.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto pr-1">
                    {chartData.map(entry => (
                      <div key={entry.name} className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                        <span className="text-slate-600 truncate flex-1 font-medium">{entry.name}</span>
                        <span className="font-bold text-slate-800">₹{entry.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }

    // 2. Drag & Drop Upload Zone
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2 flex justify-center items-center gap-2">
            <Sparkles className="text-blue-500" size={24} /> AI Bank Import
          </h2>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-8">
            Upload your PDF, CSV, or Excel bank statements. Our system parses transactions, labels them via AI, and imports them.
          </p>

          <form onSubmit={handleUpload} className="space-y-6">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-10 cursor-pointer transition-all ${
                dragOver 
                  ? 'border-blue-500 bg-blue-50/20' 
                  : file 
                    ? 'border-green-500 bg-green-50/10' 
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/30'
              }`}
            >
              <input
                type="file"
                id="fileUpload"
                className="hidden"
                accept=".pdf,.csv,.xlsx,.xls,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                disabled={isUploading}
              />
              <label htmlFor="fileUpload" className="cursor-pointer flex flex-col items-center">
                {isUploading ? (
                  <>
                    <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
                    <span className="text-slate-700 font-semibold mb-1">Processing Statement...</span>
                    <span className="text-slate-400 text-xs">AI is extracting and classifying your transactions</span>
                    
                    <div className="w-full max-w-xs bg-slate-100 rounded-full h-2 mt-4 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </>
                ) : file ? (
                  <>
                    <CheckCircle2 className="text-green-500 mb-4" size={48} />
                    <span className="text-slate-800 font-bold text-base mb-1 truncate max-w-xs">{file.name}</span>
                    <span className="text-slate-500 text-xs">{(file.size / 1024).toFixed(1)} KB • Ready to parse</span>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setFile(null)
                      }}
                      className="mt-4 text-xs font-semibold text-red-500 hover:underline"
                    >
                      Clear File
                    </button>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl mb-4">
                      <Upload size={32} />
                    </div>
                    <span className="text-slate-800 font-semibold text-base mb-1">Drag and drop statement here</span>
                    <span className="text-slate-500 text-sm">or click to browse from device</span>
                    <span className="text-slate-400 text-[10px] mt-4 uppercase tracking-widest font-bold">Supports PDF, CSV, XLSX, JPG, PNG</span>
                  </>
                )}
              </label>
            </div>

            {file && !isUploading && (
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 transform hover:-translate-y-0.5"
              >
                Parse & Staging Transactions
              </button>
            )}
          </form>
        </div>

        {/* Supported Banks Grid */}
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Supported Indian Banks</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Bank of Baroda'].map(b => (
              <div key={b} className="bg-white px-4 py-2.5 rounded-xl border border-slate-200/50 shadow-sm text-xs font-bold text-slate-700">
                {b}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-4 italic">Statements from other banks are supported via our smart fallback regex parser.</p>
        </div>
      </div>
    )
  }

  const renderInsightsTab = () => {
    if (isInsightsLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-slate-500">
          <Loader2 className="animate-spin text-blue-500 mb-4" size={40} />
          <p className="font-semibold text-sm">Analyzing import data & generating insights...</p>
        </div>
      )
    }

    if (insights.length === 0 || (insights.length === 1 && insights[0].includes('No imported'))) {
      return (
        <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-3xl max-w-xl mx-auto">
          <Sparkles className="text-slate-300 mx-auto mb-4" size={48} />
          <h3 className="text-lg font-bold text-slate-800 mb-1">No AI Insights Available</h3>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">
            Once you import statements and select transactions, AI will analyze your outgoings to deliver summaries.
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* AI Insights Board */}
          <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 rounded-3xl p-6 border border-slate-800/80 shadow-xl text-white">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Sparkles size={20} className="text-yellow-400 fill-yellow-400" /> AI Financial Recommendations
            </h3>
            
            <div className="space-y-4">
              {insights.map((ins, idx) => (
                <div key={idx} className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                  <div className="h-6 w-6 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {idx + 1}
                  </div>
                  <p className="text-slate-200 text-sm leading-relaxed">{ins}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recurring subscriptions */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm self-start">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Clock size={18} className="text-purple-500" /> Detected Recurring Bills
            </h3>

            {recurring.length === 0 ? (
              <p className="text-slate-400 text-sm italic py-8 text-center">No recurring EMIs or subscription bills detected.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recurring.map((rec, idx) => (
                  <div key={idx} className="py-3.5 flex justify-between items-center">
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-slate-800 text-sm truncate">{rec.description}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{rec.category} • {rec.frequency}</p>
                    </div>
                    <span className="font-bold text-slate-800 text-sm whitespace-nowrap">
                      ₹{rec.averageAmount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    )
  }

  const renderHistoryTab = () => {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Upload Logs</h3>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Clock className="mx-auto mb-2 text-slate-200" size={48} />
            <p className="text-sm">No statement uploads recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-left text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                  <th className="p-4">Date</th>
                  <th className="p-4">File Name</th>
                  <th className="p-4">Format</th>
                  <th className="p-4">Txns Count</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                {history.map(h => (
                  <tr key={h._id} className="hover:bg-slate-55/20 transition-colors">
                    <td className="p-4 text-xs font-semibold text-slate-500">
                      {new Date(h.uploadDate).toLocaleString()}
                    </td>
                    <td className="p-4 font-semibold text-slate-800">
                      {h.fileName}
                    </td>
                    <td className="p-4 uppercase text-xs font-medium text-slate-600">
                      {h.fileType}
                    </td>
                    <td className="p-4 font-semibold">
                      {h.totalTransactions}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.75 text-xs font-bold rounded-lg border ${
                        h.processingStatus === 'completed' || h.processingStatus === 'imported'
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : h.processingStatus === 'failed'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {h.processingStatus === 'imported' ? 'Imported' : h.processingStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
             <div className="p-2 bg-blue-100/50 rounded-xl">
               <Upload className="text-blue-600" size={32} />
             </div>
             AI Statement Import
          </h1>
          <p className="text-slate-500 text-lg">Parse bank ledgers, run AI tagging, and log automated transactions.</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('import')}
          className={`pb-4 px-6 font-semibold text-sm transition-all border-b-2 ${
            activeTab === 'import' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Statement Import
        </button>
        <button
          onClick={() => setActiveTab('insights')}
          className={`pb-4 px-6 font-semibold text-sm transition-all border-b-2 ${
            activeTab === 'insights' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          AI Analytics & Insights
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-4 px-6 font-semibold text-sm transition-all border-b-2 ${
            activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Upload History
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'import' && renderImportTab()}
        {activeTab === 'insights' && renderInsightsTab()}
        {activeTab === 'history' && renderHistoryTab()}
      </div>
    </div>
  )
}
