import { useState, useEffect } from 'react'
import axios from 'axios'
import { CreditCard, Plus, Trash2, Edit2, Eye, AlertCircle } from 'lucide-react'

export default function Loan() {
  const [loans, setLoans] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [viewingId, setViewingId] = useState(null)
  const [totalLoanAmount, setTotalLoanAmount] = useState(0)
  const [totalPaid, setTotalPaid] = useState(0)

  const [formData, setFormData] = useState({
    type: 'personal_loan',
    lenderName: '',
    totalAmount: '',
    remainingAmount: '',
    rateOfInterest: '',
    tenure: '',
    tenureUnit: 'months',
    startDate: new Date().toISOString().split('T')[0],
    description: ''
  })

  const token = localStorage.getItem('token')

  const fetchLoans = async () => {
    try {
      const response = await axios.get('https://pfa-1fqq.vercel.app/api/loan', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setLoans(response.data.loans || [])
      
      const total = response.data.loans?.reduce((sum, loan) => sum + loan.totalAmount, 0) || 0
      const paid = response.data.loans?.reduce((sum, loan) => sum + loan.amountPaid, 0) || 0
      setTotalLoanAmount(total)
      setTotalPaid(paid)
    } catch (error) {
      console.error('Error fetching loans:', error)
    }
  }

  useEffect(() => {
    fetchLoans()
  }, [])

  const calculateEMI = (principal, rate, months) => {
    if (rate === 0) {
      return (principal / months).toFixed(2)
    }
    const monthlyRate = rate / 12 / 100
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                (Math.pow(1 + monthlyRate, months) - 1)
    return emi.toFixed(2)
  }

  const calculateTotalInterest = (principal, rate, months) => {
    const emi = parseFloat(calculateEMI(principal, rate, months))
    const totalPayment = emi * months
    return (totalPayment - principal).toFixed(2)
  }

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
      const tenure = parseFloat(formData.tenure)
      const principal = parseFloat(formData.totalAmount)
      const rate = parseFloat(formData.rateOfInterest)
      
      const tenureMonths = formData.tenureUnit === 'years' ? tenure * 12 : tenure
      const monthlyEMI = parseFloat(calculateEMI(principal, rate, tenureMonths))
      
      const startDate = new Date(formData.startDate)
      const endDate = new Date(startDate)
      endDate.setMonth(endDate.getMonth() + tenureMonths)

      const payload = {
        type: formData.type,
        lenderName: formData.lenderName,
        totalAmount: principal,
        remainingAmount: parseFloat(formData.remainingAmount),
        rateOfInterest: rate,
        tenure: tenure,
        tenureUnit: formData.tenureUnit,
        monthlyEMI: monthlyEMI,
        startDate: formData.startDate,
        endDate: endDate.toISOString().split('T')[0],
        description: formData.description,
        amountPaid: 0,
        nextPaymentDate: new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }

      if (editingId) {
        await axios.put(`https://pfa-1fqq.vercel.app/api/loan/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else {
        await axios.post('https://pfa-1fqq.vercel.app/api/loan', payload, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }

      fetchLoans()
      resetForm()
    } catch (error) {
      console.error('Error saving loan:', error)
    }
  }

  const handleEdit = (loan) => {
    setFormData({
      type: loan.type,
      lenderName: loan.lenderName,
      totalAmount: loan.totalAmount,
      remainingAmount: loan.remainingAmount,
      rateOfInterest: loan.rateOfInterest,
      tenure: loan.tenure,
      tenureUnit: loan.tenureUnit,
      startDate: loan.startDate.split('T')[0],
      description: loan.description
    })
    setEditingId(loan._id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this loan?')) {
      try {
        await axios.delete(`https://pfa-1fqq.vercel.app/api/loan/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        fetchLoans()
      } catch (error) {
        console.error('Error deleting loan:', error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      type: 'personal_loan',
      lenderName: '',
      totalAmount: '',
      remainingAmount: '',
      rateOfInterest: '',
      tenure: '',
      tenureUnit: 'months',
      startDate: new Date().toISOString().split('T')[0],
      description: ''
    })
    setEditingId(null)
    setShowForm(false)
  }

  const getTypeLabel = (type) => {
    const labels = {
      'personal_loan': 'Personal Loan',
      'home_loan': 'Home Loan',
      'car_loan': 'Car Loan',
      'education_loan': 'Education Loan',
      'credit_card': 'Credit Card',
      'other': 'Other'
    }
    return labels[type] || type
  }

  const calculateLoanProgress = (remaining, total) => {
    return ((total - remaining) / total * 100).toFixed(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <CreditCard className="text-red-400" size={32} />
            Loan Management
          </h1>
          <p className="text-gray-400 mt-1">Track loans and calculate EMI with interest</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
        >
          <Plus size={20} />
          Add Loan
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-red-900/30 to-red-800/20 border border-red-700/30 rounded-lg p-6">
          <p className="text-gray-400 text-sm">Total Loan Amount</p>
          <p className="text-2xl font-bold text-red-400 mt-2">₹{totalLoanAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-700/30 rounded-lg p-6">
          <p className="text-gray-400 text-sm">Amount Paid</p>
          <p className="text-2xl font-bold text-green-400 mt-2">₹{totalPaid.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-900/30 to-orange-800/20 border border-orange-700/30 rounded-lg p-6">
          <p className="text-gray-400 text-sm">Remaining Amount</p>
          <p className="text-2xl font-bold text-orange-400 mt-2">₹{(totalLoanAmount - totalPaid).toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            {editingId ? 'Edit Loan' : 'Add New Loan'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Loan Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-red-500"
                >
                  <option value="personal_loan">Personal Loan</option>
                  <option value="home_loan">Home Loan</option>
                  <option value="car_loan">Car Loan</option>
                  <option value="education_loan">Education Loan</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Lender Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Lender Name</label>
                <input
                  type="text"
                  name="lenderName"
                  value={formData.lenderName}
                  onChange={handleChange}
                  placeholder="e.g., HDFC Bank, ICICI"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              {/* Total Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Total Loan Amount (₹)</label>
                <input
                  type="number"
                  name="totalAmount"
                  value={formData.totalAmount}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              {/* Remaining Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Remaining Amount (₹)</label>
                <input
                  type="number"
                  name="remainingAmount"
                  value={formData.remainingAmount}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              {/* Interest Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Rate of Interest (% per annum)</label>
                <input
                  type="number"
                  name="rateOfInterest"
                  value={formData.rateOfInterest}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              {/* Tenure */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tenure</label>
                  <input
                    type="number"
                    name="tenure"
                    value={formData.tenure}
                    onChange={handleChange}
                    placeholder="0"
                    step="0.01"
                    min="0"
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Unit</label>
                  <select
                    name="tenureUnit"
                    value={formData.tenureUnit}
                    onChange={handleChange}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-red-500"
                  required
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
                placeholder="Add notes about this loan..."
                rows="3"
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
              ></textarea>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition font-medium"
              >
                {editingId ? 'Update Loan' : 'Add Loan'}
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

      {/* Loans List */}
      <div className="space-y-4">
        {loans.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/50 border border-slate-700 rounded-lg">
            <CreditCard size={40} className="mx-auto text-gray-500 mb-3" />
            <p className="text-gray-400">No loans added yet.</p>
          </div>
        ) : (
          loans.map((loan) => {
            const tenureMonths = loan.tenureUnit === 'years' ? loan.tenure * 12 : loan.tenure
            const emi = calculateEMI(loan.totalAmount, loan.rateOfInterest, tenureMonths)
            const totalInterest = calculateTotalInterest(loan.totalAmount, loan.rateOfInterest, tenureMonths)
            const progress = calculateLoanProgress(loan.remainingAmount, loan.totalAmount)
            const monthsPassed = Math.floor((new Date() - new Date(loan.startDate)) / (1000 * 60 * 60 * 24 * 30))

            return (
              <div key={loan._id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-white">{loan.lenderName}</h3>
                      <span className="text-xs px-2 py-1 bg-red-900/50 text-red-300 rounded-full">
                        {getTypeLabel(loan.type)}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mt-1">
                      {loan.description || 'No description'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewingId(viewingId === loan._id ? null : loan._id)}
                      className="p-2 bg-blue-900/50 hover:bg-blue-800 text-blue-400 rounded transition"
                      title="View details"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => handleEdit(loan)}
                      className="p-2 bg-purple-900/50 hover:bg-purple-800 text-purple-400 rounded transition"
                      title="Edit"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(loan._id)}
                      className="p-2 bg-red-900/50 hover:bg-red-800 text-red-400 rounded transition"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Loan Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-gray-400 text-xs">Total Amount</p>
                    <p className="text-white font-semibold">₹{loan.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Monthly EMI</p>
                    <p className="text-white font-semibold">₹{parseFloat(emi).toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Interest Rate</p>
                    <p className="text-white font-semibold">{loan.rateOfInterest}% p.a.</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Total Interest</p>
                    <p className="text-white font-semibold">₹{parseFloat(totalInterest).toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-gray-400 text-sm">Loan Repayment Progress</p>
                    <p className="text-white font-semibold">{progress}%</p>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        progress < 50
                          ? 'bg-green-500'
                          : progress < 90
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Expanded View */}
                {viewingId === loan._id && (
                  <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
                    <div className="bg-blue-900/20 border border-blue-800/30 rounded p-3">
                      <p className="text-blue-300 text-sm font-semibold mb-2 flex items-center gap-2">
                        <AlertCircle size={16} />
                        EMI & Interest Calculation
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-400 text-xs">Monthly EMI</p>
                          <p className="text-blue-300 font-semibold">₹{parseFloat(emi).toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                          <p className="text-gray-500 text-xs mt-1">Formula: (P × r × (1+r)^n) / ((1+r)^n - 1)</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">Total Interest to Pay</p>
                          <p className="text-blue-300 font-semibold">₹{parseFloat(totalInterest).toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                          <p className="text-gray-500 text-xs mt-1">Total Payments: {tenureMonths} months</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-400 text-sm">Remaining Amount</p>
                        <p className="text-white font-semibold">₹{loan.remainingAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Amount Paid</p>
                        <p className="text-white font-semibold">₹{loan.amountPaid.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Loan Period</p>
                        <p className="text-white font-semibold">{loan.tenure} {loan.tenureUnit}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Start Date</p>
                        <p className="text-white font-semibold">{new Date(loan.startDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">End Date</p>
                        <p className="text-white font-semibold">{new Date(loan.endDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Months Elapsed</p>
                        <p className="text-white font-semibold">{monthsPassed} months</p>
                      </div>
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
