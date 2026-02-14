import { useState, useEffect } from 'react'
import axios from 'axios'
import { Calculator, Download, TrendingDown, AlertCircle, CheckCircle2, Lightbulb, DollarSign, ChevronDown, ChevronUp, FileText, X } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function TaxSaving() {
  const [taxData, setTaxData] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [expandedSection, setExpandedSection] = useState(null)

  const [formData, setFormData] = useState({
    annualIncome: '',
    taxRegime: 'old_regime',
    taxSavingInvestments: {
      ppf: { invested: 0 },
      elss: { invested: 0 },
      nps: { invested: 0 },
      npsAdditional: { invested: 0 },
      lifeInsurance: { invested: 0 },
      homeLoansInterest: { invested: 0 }
    },
    healthInsurance: {
      self: 0,
      familyMembers: 0,
      parents: 0,
      parentsAbove60: 0
    },
    studentLoanInterest: { amount: 0 },
    charityDonations: { amount: 0 }
  })

  const token = localStorage.getItem('token')

  const fetchTaxDetails = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/tax-saving`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setTaxData(response.data.taxSaving)
      populateFormData(response.data.taxSaving)
    } catch (error) {
      console.error('Error fetching tax details:', error)
      setTaxData(null)
    } finally {
      setLoading(false)
    }
  }

  const populateFormData = (data) => {
    if (!data) return;
    setFormData({
      annualIncome: data.annualIncome || '',
      taxRegime: data.taxRegime || 'old_regime',
      taxSavingInvestments: data.taxSavingInvestments || {
        ppf: { invested: 0 },
        elss: { invested: 0 },
        nps: { invested: 0 },
        npsAdditional: { invested: 0 },
        lifeInsurance: { invested: 0 },
        homeLoansInterest: { invested: 0 }
      },
      healthInsurance: data.healthInsurance || {
        self: 0,
        familyMembers: 0,
        parents: 0,
        parentsAbove60: 0
      },
      studentLoanInterest: data.studentLoanInterest || { amount: 0 },
      charityDonations: data.charityDonations || { amount: 0 }
    })
  }

  useEffect(() => {
    fetchTaxDetails()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'annualIncome' ? parseFloat(value) || '' : value
    }))
  }

  const handleNestedChange = (section, subsection, value) => {
    const numValue = parseFloat(value) || 0
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section]?.[subsection],
          invested: numValue
        }
      }
    }))
  }

  const handleHealthInsuranceChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      healthInsurance: {
        ...prev.healthInsurance,
        [field]: parseFloat(value) || 0
      }
    }))
  }

  const handleOtherDeductionChange = (section, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        amount: parseFloat(value) || 0
      }
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const response = await axios.post(`${API_URL}/tax-saving`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setTaxData(response.data.taxSaving)
      setShowForm(false)
      // alert('Tax details saved successfully!') // Removed alert for cleaner UX
    } catch (error) {
      console.error('Error saving tax details:', error)
      alert('Error saving tax details')
    } finally {
      setLoading(false)
    }
  }

  const downloadITRSummary = async () => {
    try {
      const response = await axios.get(`${API_URL}/tax-saving/itr-summary`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const summary = response.data.itrSummary
      const csvContent = generateCSV(summary)
      downloadCSV(csvContent, `ITR_Summary_${summary.financialYear}.csv`)
    } catch (error) {
      console.error('Error generating ITR summary:', error)
      alert('Error generating ITR summary')
    }
  }

  const generateCSV = (summary) => {
    let csv = 'Tax Saving Report - ITR Ready Summary\n'
    csv += `Financial Year,${summary.financialYear}\n`
    csv += `Generated Date,${new Date(summary.generatedAt).toLocaleDateString()}\n\n`
    csv += 'INCOME DETAILS\n'
    csv += `Gross Annual Income,${summary.grossIncome}\n\n`
    csv += 'DEDUCTIONS\n'
    csv += `Section 80C - PPF,${summary.deductions.section80C.ppf}\n`
    csv += `Section 80C - ELSS,${summary.deductions.section80C.elss}\n`
    csv += `Section 80C - NPS,${summary.deductions.section80C.nps}\n`
    csv += `Section 80C - Life Insurance,${summary.deductions.section80C.lifeInsurance}\n`
    csv += `Section 80C - Home Loan Interest,${summary.deductions.section80C.homeLoansInterest}\n`
    csv += `Section 80C Total (Max 150000),${summary.deductions.section80C.total}\n`
    csv += `Section 80D - Health Insurance,${summary.deductions.section80D.healthInsurance}\n`
    csv += `Section 80CCD(1B) - NPS Additional,${summary.deductions.section80CCD1B.nps}\n`
    csv += `Section 80E - Student Loan Interest,${summary.deductions.section80E.studentLoanInterest}\n`
    csv += `Section 80G - Charity Donations,${summary.deductions.section80G.charityDonations}\n`
    csv += `Total Deductions,${summary.deductions.totalDeductions}\n\n`
    csv += 'TAX CALCULATION\n'
    csv += `Taxable Income,${summary.taxableIncome}\n`
    csv += `Estimated Tax Liability,${summary.estimatedTaxLiability}\n`
    csv += `Estimated Tax Savings,${summary.estimatedSavings}\n`

    return csv
  }

  const downloadCSV = (content, filename) => {
    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(content))
    element.setAttribute('download', filename)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  if (loading && !taxData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
         <div className="flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-500 font-medium">Crunching numbers...</p>
         </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
           <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
               <div className="p-2 bg-amber-100/50 rounded-xl">
                   <Calculator className="text-amber-600" size={32} />
               </div>
               Tax Optimizer
           </h1>
           <p className="text-slate-500 mt-2 text-lg">Calculate liability & discover saving opportunities</p>
        </div>
        <div className="flex gap-3">
          {taxData && (
            <button
              onClick={downloadITRSummary}
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50 px-4 py-2.5 rounded-lg transition-all shadow-sm font-medium"
            >
              <Download size={18} />
              ITR Report
            </button>
          )}
          <button
            onClick={() => {
              setShowForm(!showForm)
              if (!showForm) populateFormData(taxData || {})
            }}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-slate-900/20 font-medium active:scale-95"
          >
            {showForm ? 'Cancel Edit' : 'Update Income'}
          </button>
        </div>
      </div>

      {/* Form Section - Modern Card */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-top-4 duration-300">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
             <h2 className="text-lg font-bold text-slate-800">Income & Investment Details</h2>
             <button onClick={() => setShowForm(false)}>
                 <X className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full p-1" size={24}/>
             </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
            {/* Basic Income */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Annual Income (₹)</label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                    type="number"
                    name="annualIncome"
                    value={formData.annualIncome}
                    onChange={handleChange}
                    placeholder="e.g., 1000000"
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                    required
                    />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tax Regime</label>
                <select
                  name="taxRegime"
                  value={formData.taxRegime}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none cursor-pointer"
                >
                  <option value="old_regime">Old Regime (Deductions Allowed)</option>
                  <option value="new_regime">New Regime (Lower Rates, No Deductions)</option>
                </select>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6"></div>

            {/* Section 80C Investments */}
            <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 rounded text-blue-600"><DollarSign size={18} /></div>
                Section 80C Investments <span className="text-slate-400 font-normal text-sm ml-2">(Max Deduction: ₹1,50,000)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {[
                     { label: 'PPF', key: 'ppf', desc: 'Public Provident Fund' },
                     { label: 'ELSS Funds', key: 'elss', desc: 'Equity Linked Saving' },
                     { label: 'NPS (Tier-1)', key: 'nps', desc: 'National Pension Scheme' },
                     { label: 'Life Insurance', key: 'lifeInsurance', desc: 'Premium Paid' },
                     { label: 'Home Loan Interest', key: 'homeLoansInterest', desc: 'Section 80EE' },
                 ].map((item) => (
                    <div key={item.key}>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">{item.label}</label>
                        <input
                            type="number"
                            value={formData.taxSavingInvestments[item.key].invested}
                            onChange={(e) => handleNestedChange('taxSavingInvestments', item.key, e.target.value)}
                            placeholder="0"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:border-blue-500 outline-none text-sm"
                        />
                        <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                    </div>
                 ))}
              </div>
              
              {/* Additional NPS */}
              <div className="mt-6 pt-6 border-t border-slate-200/50">
                   <h4 className="font-semibold text-slate-700 mb-3 text-sm">Section 80CCD(1B) - Additional NPS</h4>
                   <div className="max-w-xs">
                        <input
                            type="number"
                            value={formData.taxSavingInvestments.npsAdditional.invested}
                            onChange={(e) => handleNestedChange('taxSavingInvestments', 'npsAdditional', e.target.value)}
                            placeholder="0"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:border-blue-500 outline-none text-sm"
                        />
                        <p className="text-xs text-slate-400 mt-1">Extra ₹50,000 deduction over 80C</p>
                   </div>
              </div>
            </div>

            {/* Section 80D - Health Insurance */}
            <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <div className="p-1.5 bg-rose-100 rounded text-rose-600"><AlertCircle size={18} /></div>
                Section 80D - Health Insurance <span className="text-slate-400 font-normal text-sm ml-2">(Max: ₹1,00,000)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Self & Family', key: 'self', limit: '25,000' },
                    { label: 'Parents (<60)', key: 'parents', limit: '25,000' },
                    { label: 'Parents (60+)', key: 'parentsAbove60', limit: '50,000' },
                ].map(item => (
                    <div key={item.key}>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">{item.label}</label>
                        <input
                            type="number"
                            value={formData.healthInsurance[item.key]}
                            onChange={(e) => handleHealthInsuranceChange(item.key, e.target.value)}
                            placeholder="0"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:border-rose-500 outline-none text-sm"
                        />
                        <p className="text-xs text-slate-400 mt-1">Max: ₹{item.limit}</p>
                    </div>
                ))}
              </div>
            </div>

            {/* Other Deductions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-6">
                <label className="block font-bold text-slate-800 mb-2">Section 80E - Education Loan Interest</label>
                <input
                  type="number"
                  value={formData.studentLoanInterest.amount}
                  onChange={(e) => handleOtherDeductionChange('studentLoanInterest', e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:border-amber-500 outline-none"
                />
                <p className="text-xs text-slate-400 mt-1">No Upper Limit on Interest</p>
              </div>

              <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-6">
                <label className="block font-bold text-slate-800 mb-2">Section 80G - Donations</label>
                <input
                  type="number"
                  value={formData.charityDonations.amount}
                  onChange={(e) => handleOtherDeductionChange('charityDonations', e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:border-amber-500 outline-none"
                />
                 <p className="text-xs text-slate-400 mt-1">Eligible Charity Donations</p>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-lg font-bold px-8 py-3 rounded-xl shadow-lg shadow-slate-900/10 transition-all active:scale-95"
              >
                Calculate Tax & Save
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-8 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Results Section */}
      {taxData && !showForm && (
        <div className="space-y-8 animate-in fade-in duration-500">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-blue-100 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Wallet size={64} className="text-blue-600"/></div>
              <p className="text-slate-500 text-sm font-medium">Gross Annual Income</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">₹{taxData.annualIncome.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white border border-purple-100 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><TrendingDown size={64} className="text-purple-600"/></div>
              <p className="text-slate-500 text-sm font-medium">Total Deductions Claimed</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">₹{taxData.totalDeductions.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white border border-orange-100 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><FileText size={64} className="text-orange-600"/></div>
              <p className="text-slate-500 text-sm font-medium">Taxable Income</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">₹{taxData.taxableIncome.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white border border-red-100 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><AlertCircle size={64} className="text-red-600"/></div>
              <p className="text-slate-500 text-sm font-medium">Net Tax Liability</p>
              <p className="text-3xl font-extrabold text-red-600 mt-1">₹{taxData.estimatedTaxLiability.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Tax Savings Highlight */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-8 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                        <CheckCircle2 className="text-white" size={32} />
                    </div>
                    <div>
                        <h3 className="text-3xl font-bold">₹{taxData.estimatedSavings.toLocaleString('en-IN')}</h3>
                        <p className="text-emerald-100 font-medium">Total Tax Saved via Deductions</p>
                    </div>
                 </div>
                 <div className="text-right md:max-w-xs">
                     <p className="text-sm text-emerald-100/80">Great job! You are utilizing the available tax provisions to reduce your liability.</p>
                 </div>
            </div>
            {/* Decorative BG */}
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-black/10 rounded-full blur-3xl"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Deduction Breakdown */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-slate-800">Deductions Breakdown</h3>
                    
                    {/* 80C Card */}
                    <div 
                        className={`bg-white border ${expandedSection === '80C' ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-200'} rounded-2xl p-5 cursor-pointer transition-all hover:border-blue-400`}
                        onClick={() => setExpandedSection(expandedSection === '80C' ? null : '80C')}
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><DollarSign size={20}/></div>
                                <div>
                                    <h4 className="font-semibold text-slate-800">Section 80C</h4>
                                    <p className="text-xs text-slate-500">Investments & Expenses</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-slate-900">₹{taxData.totalSection80CDeduction.toLocaleString('en-IN')}</span>
                                {expandedSection === '80C' ? <ChevronUp size={18} className="text-slate-400"/> : <ChevronDown size={18} className="text-slate-400"/>}
                            </div>
                        </div>
                        {expandedSection === '80C' && (
                            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-sm animate-in slide-in-from-top-2">
                                <div className="flex justify-between"><span className="text-slate-500">PPF</span><span className="font-medium text-slate-700">₹{taxData.taxSavingInvestments.ppf.invested.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">ELSS</span><span className="font-medium text-slate-700">₹{taxData.taxSavingInvestments.elss.invested.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Life Insurance</span><span className="font-medium text-slate-700">₹{taxData.taxSavingInvestments.lifeInsurance.invested.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Home Loan Interest</span><span className="font-medium text-slate-700">₹{taxData.taxSavingInvestments.homeLoansInterest.invested.toLocaleString()}</span></div>
                            </div>
                        )}
                    </div>

                    {/* 80D Card */}
                    <div 
                        className={`bg-white border ${expandedSection === '80D' ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-slate-200'} rounded-2xl p-5 cursor-pointer transition-all hover:border-rose-400`}
                        onClick={() => setExpandedSection(expandedSection === '80D' ? null : '80D')}
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><AlertCircle size={20}/></div>
                                <div>
                                    <h4 className="font-semibold text-slate-800">Section 80D</h4>
                                    <p className="text-xs text-slate-500">Health Insurance</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-slate-900">₹{taxData.totalSection80DDeduction.toLocaleString('en-IN')}</span>
                                {expandedSection === '80D' ? <ChevronUp size={18} className="text-slate-400"/> : <ChevronDown size={18} className="text-slate-400"/>}
                            </div>
                        </div>
                         {expandedSection === '80D' && (
                            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-sm animate-in slide-in-from-top-2">
                                <div className="flex justify-between"><span className="text-slate-500">Self & Family</span><span className="font-medium text-slate-700">₹{taxData.healthInsurance.self.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Parents</span><span className="font-medium text-slate-700">₹{taxData.healthInsurance.parents.toLocaleString()}</span></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recommendations */}
                <div className="space-y-4">
                     <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                         <Lightbulb className="text-yellow-500 fill-yellow-500" size={20} />
                         Smart Recommendations
                     </h3>
                     
                     {(!taxData.recommendations || taxData.recommendations.length === 0) ? (
                         <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
                             <CheckCircle2 size={32} className="mx-auto text-green-500 mb-2"/>
                             <p>You have optimized your tax savings!</p>
                         </div>
                     ) : (
                         <div className="space-y-3">
                             {taxData.recommendations.map((rec, idx) => (
                                 <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
                                     <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${rec.priority === 'high' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                                     <div className="flex-1">
                                         <h4 className="font-bold text-slate-800 capitalize text-sm">{rec.type.replace('_', ' ')}</h4>
                                         <p className="text-xs text-slate-500 mt-1 leading-relaxed">{rec.description}</p>
                                         <div className="mt-2 flex items-center gap-4 text-xs">
                                             <span className="font-semibold text-slate-700">Invest: <span className="text-emerald-600">₹{rec.amount.toLocaleString()}</span></span>
                                             <span className="text-slate-400">|</span>
                                             <span className="font-semibold text-slate-700">Save Tax: <span className="text-emerald-600">₹{rec.benefit.toLocaleString()}</span></span>
                                         </div>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     )}
                </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!taxData && !showForm && !loading && (
        <div className="text-center py-20 bg-white border border-dashed border-slate-300 rounded-2xl">
          <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
             <Calculator size={40} className="text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No Tax Declaration Found</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-8">Enter your annual income and investment details to generate a tax report and get personalized saving advice.</p>
          <button
            onClick={() => {
                setShowForm(true)
                populateFormData({})
            }}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all active:scale-95"
          >
            Start Tax Calculation
          </button>
        </div>
      )}
    </div>
  )
}
