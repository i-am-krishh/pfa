import { useState, useEffect } from 'react'
import axios from 'axios'
import { CreditCard, Plus, Trash2, Edit2, Eye, AlertCircle, Calendar, DollarSign, Percent, CheckCircle2 } from 'lucide-react'

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
      const response = await axios.get('http://localhost:5000/api/loan', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setLoans(response.data.loans || [])
      
      const total = response.data.loans?.reduce((sum, loan) => sum + loan.totalAmount, 0) || 0
      const paid = response.data.loans?.reduce((sum, loan) => sum + (loan.totalAmount - loan.remainingAmount), 0) || 0
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

      // Calculate amount paid based on current remaining amount input
      // If user inputs remaining amount, we calculate paid as total - remaining
      const remaining = parseFloat(formData.remainingAmount)
      const paidObj = totalAmount - remaining

      const payload = {
        type: formData.type,
        lenderName: formData.lenderName,
        totalAmount: principal,
        remainingAmount: remaining,
        rateOfInterest: rate,
        tenure: tenure,
        tenureUnit: formData.tenureUnit,
        monthlyEMI: monthlyEMI,
        startDate: formData.startDate,
        endDate: endDate.toISOString().split('T')[0],
        description: formData.description,
        amountPaid: principal - remaining, // Simple diff
        nextPaymentDate: new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }

      if (editingId) {
        await axios.put(`http://localhost:5000/api/loan/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else {
        await axios.post('http://localhost:5000/api/loan', payload, {
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
        await axios.delete(`http://localhost:5000/api/loan/${id}`, {
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
    if (total === 0) return 0
    return ((total - remaining) / total * 100).toFixed(1)
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
             <div className="p-2 bg-red-100/50 rounded-xl">
               <CreditCard className="text-red-600" size={32} />
             </div>
             Loan Management
          </h1>
          <p className="text-slate-500 text-lg">Track your liabilities and repayment progress</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="group flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white px-6 py-3 rounded-xl transition-all shadow-lg shadow-slate-900/20 font-semibold"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          Add New Loan
        </button>
      </div>

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
             <DollarSign size={80} className="text-red-600" />
          </div>
          <div className="relative z-10">
             <p className="text-slate-500 font-medium mb-2 flex items-center gap-2">
               <DollarSign size={16} /> Total Outstanding
             </p>
             <h3 className="text-3xl font-bold text-slate-900">
               ₹{(totalLoanAmount - totalPaid).toLocaleString('en-IN', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
             </h3>
             <p className="text-red-500 text-xs mt-2 font-medium">Principal Remaining</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
             <CheckCircle2 size={80} className="text-green-600" />
          </div>
          <div className="relative z-10">
             <p className="text-slate-500 font-medium mb-2 flex items-center gap-2">
               <CheckCircle2 size={16} /> Total Repaid
             </p>
             <h3 className="text-3xl font-bold text-slate-900">
               ₹{totalPaid.toLocaleString('en-IN', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
             </h3>
             <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3">
                <div 
                   className="bg-green-500 h-1.5 rounded-full transition-all duration-1000" 
                   style={{ width: `${totalLoanAmount > 0 ? (totalPaid / totalLoanAmount) * 100 : 0}%` }}
                ></div>
             </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
             <CreditCard size={80} className="text-orange-600" />
          </div>
          <div className="relative z-10">
             <p className="text-slate-500 font-medium mb-2 flex items-center gap-2">
               <CreditCard size={16} /> Total Borrowed
             </p>
             <h3 className="text-3xl font-bold text-slate-900">
               ₹{totalLoanAmount.toLocaleString('en-IN', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
             </h3>
             <p className="text-slate-400 text-xs mt-2">Original principal amount</p>
          </div>
        </div>
      </div>

      {/* Edit/Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingId ? 'Edit Loan Details' : 'Add New Liability'}
                </h2>
                <p className="text-slate-500 text-sm">Enter loan information below</p>
              </div>
              <button 
                onClick={resetForm}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <Trash2 className="rotate-45" size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Type */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Loan Type</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                  >
                    <option value="personal_loan">Personal Loan</option>
                    <option value="home_loan">Home Loan</option>
                    <option value="car_loan">Car Loan</option>
                    <option value="education_loan">Education Loan</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Lender */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Lender / Bank</label>
                  <input
                    type="text"
                    name="lenderName"
                    value={formData.lenderName}
                    onChange={handleChange}
                    placeholder="e.g. HDFC Bank"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all placeholder:text-slate-400"
                    required
                  />
                </div>

                {/* Total Amount */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Total Sanctioned Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                    <input
                      type="number"
                      name="totalAmount"
                      value={formData.totalAmount}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all placeholder:text-slate-400"
                      required
                    />
                  </div>
                </div>

                {/* Remaining Amount */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Outstanding Balance (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                    <input
                      type="number"
                      name="remainingAmount"
                      value={formData.remainingAmount}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all placeholder:text-slate-400"
                      required
                    />
                  </div>
                </div>

                {/* Interest Rate */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Interest Rate (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      name="rateOfInterest"
                      value={formData.rateOfInterest}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all placeholder:text-slate-400"
                      required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">%</span>
                  </div>
                </div>

                {/* Tenure */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Tenure Period</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      name="tenure"
                      value={formData.tenure}
                      onChange={handleChange}
                      placeholder="0"
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all placeholder:text-slate-400"
                      required
                    />
                    <select
                      name="tenureUnit"
                      value={formData.tenureUnit}
                      onChange={handleChange}
                      className="w-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                    >
                      <option value="months">Months</option>
                      <option value="years">Years</option>
                    </select>
                  </div>
                </div>

                {/* Start Date */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-slate-600"
                    required
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                   <label className="text-sm font-semibold text-slate-700">Notes (Optional)</label>
                   <textarea
                     name="description"
                     value={formData.description}
                     onChange={handleChange}
                     rows="3"
                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all placeholder:text-slate-400"
                     placeholder="Additional details..."
                   ></textarea>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-lg shadow-red-600/20 transition-all transform active:scale-95"
                >
                  {editingId ? 'Save Changes' : 'Create Loan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loans Grid */}
      <div className="grid grid-cols-1 gap-6">
        {loans.length === 0 ? (
          <div className="text-center py-16 bg-white border border-dashed border-slate-300 rounded-3xl">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
               <CreditCard size={32} className="text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-1">No Loans Found</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              You're debt free! Or you haven't added any yet.
            </p>
            <button
              onClick={() => {
                resetForm()
                setShowForm(true)
              }}
              className="mt-6 px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition-colors"
            >
              Add a Loan
            </button>
          </div>
        ) : (
          loans.map((loan) => {
             const tenureMonths = loan.tenureUnit === 'years' ? loan.tenure * 12 : loan.tenure
             const emi = calculateEMI(loan.totalAmount, loan.rateOfInterest, tenureMonths)
             const totalInterest = calculateTotalInterest(loan.totalAmount, loan.rateOfInterest, tenureMonths)
             const progress = calculateLoanProgress(loan.remainingAmount, loan.totalAmount)

             return (
               <div key={loan._id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
                 <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
                   
                   {/* Left: Basic Info */}
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-3 mb-2">
                       <h3 className="text-lg font-bold text-slate-900 truncate">{loan.lenderName}</h3>
                       <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-600 uppercase tracking-wide border border-red-100">
                         {getTypeLabel(loan.type)}
                       </span>
                     </div>
                     <div className="flex items-center gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5"><Calendar size={14}/> {new Date(loan.startDate).toLocaleDateString()}</div>
                        <div className="flex items-center gap-1.5"><Percent size={14}/> {loan.rateOfInterest}% Interest</div>
                     </div>
                   </div>

                   {/* Middle: Progress Bar Section */}
                   <div className="flex-1 max-w-sm w-full">
                      <div className="flex justify-between items-end mb-2">
                         <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Repayment Progress</span>
                         <span className="text-sm font-bold text-slate-700">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                         <div
                           className={`h-full rounded-full transition-all duration-1000 ${
                             progress < 30 ? 'bg-red-500' : progress < 70 ? 'bg-orange-500' : 'bg-green-500'
                           }`}
                           style={{ width: `${progress}%` }}
                         ></div>
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-slate-500">
                         <span>₹{(loan.totalAmount - loan.remainingAmount).toLocaleString('en-IN')} Paid</span>
                         <span>₹{loan.remainingAmount.toLocaleString('en-IN')} Remaining</span>
                      </div>
                   </div>

                   {/* Right: Actions */}
                   <div className="flex items-center gap-2 self-start md:self-center">
                      <button
                        onClick={() => setViewingId(viewingId === loan._id ? null : loan._id)}
                        className={`p-2 rounded-lg transition-colors ${viewingId === loan._id ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}
                        title="Expand Details"
                      >
                         <Eye size={20} />
                      </button>
                      <button
                        onClick={() => handleEdit(loan)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-blue-600"
                        title="Edit"
                      >
                         <Edit2 size={20} />
                      </button>
                      <button
                        onClick={() => handleDelete(loan._id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors text-slate-400 hover:text-red-500"
                        title="Delete"
                      >
                         <Trash2 size={20} />
                      </button>
                   </div>
                 </div>

                 {/* Expanded Details */}
                 {viewingId === loan._id && (
                   <div className="mt-6 pt-6 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                     <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                        <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold">
                           <AlertCircle size={18} className="text-blue-500"/>
                           <h3>Loan Analysis</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                           <div>
                              <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Monthly EMI</p>
                              <p className="text-lg font-bold text-slate-900">₹{parseFloat(emi).toLocaleString('en-IN')}</p>
                           </div>
                           <div>
                              <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Total Interest</p>
                              <p className="text-lg font-bold text-red-600">₹{parseFloat(totalInterest).toLocaleString('en-IN')}</p>
                           </div>
                           <div>
                              <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Total Repayment</p>
                              <p className="text-lg font-bold text-slate-900">₹{(loan.totalAmount + parseFloat(totalInterest)).toLocaleString('en-IN')}</p>
                           </div>
                           <div>
                              <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Tenure</p>
                              <p className="text-lg font-bold text-slate-900">{loan.tenure} {loan.tenureUnit}</p>
                           </div>
                        </div>
                         {(loan.description) && (
                           <div className="mt-4 pt-4 border-t border-slate-200/50">
                              <p className="text-sm text-slate-600 italic">"{loan.description}"</p>
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
