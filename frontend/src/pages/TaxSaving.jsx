import { useState, useEffect } from 'react'
import axios from 'axios'
import { Calculator, Download, TrendingDown, AlertCircle, CheckCircle2, Lightbulb, DollarSign } from 'lucide-react'

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
      const response = await axios.get('http://localhost:5000/api/tax-saving', {
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
    setFormData({
      annualIncome: data.annualIncome || '',
      taxRegime: data.taxRegime || 'old_regime',
      taxSavingInvestments: data.taxSavingInvestments || formData.taxSavingInvestments,
      healthInsurance: data.healthInsurance || formData.healthInsurance,
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
      const response = await axios.post('http://localhost:5000/api/tax-saving', formData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setTaxData(response.data.taxSaving)
      setShowForm(false)
      alert('Tax details saved successfully!')
    } catch (error) {
      console.error('Error saving tax details:', error)
      alert('Error saving tax details')
    } finally {
      setLoading(false)
    }
  }

  const downloadITRSummary = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/tax-saving/itr-summary', {
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
    csv += `Gross Annual Income,₹${summary.grossIncome.toLocaleString('en-IN')}\n\n`
    csv += 'DEDUCTIONS\n'
    csv += `Section 80C - PPF,₹${summary.deductions.section80C.ppf.toLocaleString('en-IN')}\n`
    csv += `Section 80C - ELSS,₹${summary.deductions.section80C.elss.toLocaleString('en-IN')}\n`
    csv += `Section 80C - NPS,₹${summary.deductions.section80C.nps.toLocaleString('en-IN')}\n`
    csv += `Section 80C - Life Insurance,₹${summary.deductions.section80C.lifeInsurance.toLocaleString('en-IN')}\n`
    csv += `Section 80C - Home Loan Interest,₹${summary.deductions.section80C.homeLoansInterest.toLocaleString('en-IN')}\n`
    csv += `Section 80C Total (Max 1,50,000),₹${summary.deductions.section80C.total.toLocaleString('en-IN')}\n`
    csv += `Section 80D - Health Insurance,₹${summary.deductions.section80D.healthInsurance.toLocaleString('en-IN')}\n`
    csv += `Section 80CCD(1B) - NPS Additional,₹${summary.deductions.section80CCD1B.nps.toLocaleString('en-IN')}\n`
    csv += `Section 80E - Student Loan Interest,₹${summary.deductions.section80E.studentLoanInterest.toLocaleString('en-IN')}\n`
    csv += `Section 80G - Charity Donations,₹${summary.deductions.section80G.charityDonations.toLocaleString('en-IN')}\n`
    csv += `Total Deductions,₹${summary.deductions.totalDeductions.toLocaleString('en-IN')}\n\n`
    csv += 'TAX CALCULATION\n'
    csv += `Taxable Income,₹${summary.taxableIncome.toLocaleString('en-IN')}\n`
    csv += `Estimated Tax Liability,₹${summary.estimatedTaxLiability.toLocaleString('en-IN')}\n`
    csv += `Estimated Tax Savings,₹${summary.estimatedSavings.toLocaleString('en-IN')}\n`

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
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Calculator className="mx-auto text-blue-400 mb-3" size={40} />
          <p className="text-gray-400">Loading tax details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Calculator className="text-green-400" size={32} />
            Tax Saving Optimizer
          </h1>
          <p className="text-gray-400 mt-1">Calculate tax liability & get personalized investment recommendations</p>
        </div>
        <div className="flex gap-3">
          {taxData && (
            <button
              onClick={downloadITRSummary}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
            >
              <Download size={20} />
              Download ITR Summary
            </button>
          )}
          <button
            onClick={() => {
              setShowForm(!showForm)
              if (!showForm) populateFormData(taxData || {})
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            {showForm ? 'Cancel' : 'Edit/Add Income'}
          </button>
        </div>
      </div>

      {/* Form Section */}
      {showForm && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 space-y-6">
          <h2 className="text-xl font-bold text-white">Tax & Income Details</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Income */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Annual Income (₹)</label>
                <input
                  type="number"
                  name="annualIncome"
                  value={formData.annualIncome}
                  onChange={handleChange}
                  placeholder="e.g., 1000000"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tax Regime</label>
                <select
                  name="taxRegime"
                  value={formData.taxRegime}
                  onChange={handleChange}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-green-500"
                >
                  <option value="old_regime">Old Regime</option>
                  <option value="new_regime">New Regime</option>
                </select>
              </div>
            </div>

            {/* Section 80C Investments */}
            <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <DollarSign size={20} className="text-blue-400" />
                Section 80C Investments (Max: ₹1,50,000)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* PPF */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Public Provident Fund (PPF)</label>
                  <input
                    type="number"
                    value={formData.taxSavingInvestments.ppf.invested}
                    onChange={(e) => handleNestedChange('taxSavingInvestments', 'ppf', e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-green-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max: ₹1,50,000</p>
                </div>

                {/* ELSS */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">ELSS (Equity Linked Saving)</label>
                  <input
                    type="number"
                    value={formData.taxSavingInvestments.elss.invested}
                    onChange={(e) => handleNestedChange('taxSavingInvestments', 'elss', e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-green-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Tax-saving mutual funds</p>
                </div>

                {/* NPS */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">NPS (Tier-1)</label>
                  <input
                    type="number"
                    value={formData.taxSavingInvestments.nps.invested}
                    onChange={(e) => handleNestedChange('taxSavingInvestments', 'nps', e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-green-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">National Pension Scheme</p>
                </div>

                {/* Life Insurance */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Life Insurance Premium</label>
                  <input
                    type="number"
                    value={formData.taxSavingInvestments.lifeInsurance.invested}
                    onChange={(e) => handleNestedChange('taxSavingInvestments', 'lifeInsurance', e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-green-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Life insurance policies</p>
                </div>

                {/* Home Loan Interest */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Home Loan Interest</label>
                  <input
                    type="number"
                    value={formData.taxSavingInvestments.homeLoansInterest.invested}
                    onChange={(e) => handleNestedChange('taxSavingInvestments', 'homeLoansInterest', e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-green-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Section 80EE</p>
                </div>
              </div>
            </div>

            {/* Section 80CCD(1B) - NPS Additional */}
            <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-4">Section 80CCD(1B) - Additional NPS (Max: ₹50,000)</h3>
              <input
                type="number"
                value={formData.taxSavingInvestments.npsAdditional.invested}
                onChange={(e) => handleNestedChange('taxSavingInvestments', 'npsAdditional', e.target.value)}
                placeholder="0"
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-green-500"
              />
              <p className="text-xs text-gray-500 mt-2">Additional NPS contribution over Section 80C limit</p>
            </div>

            {/* Section 80D - Health Insurance */}
            <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <AlertCircle size={20} className="text-red-400" />
                Section 80D - Health Insurance (Max: ₹1,00,000)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Self</label>
                  <input
                    type="number"
                    value={formData.healthInsurance.self}
                    onChange={(e) => handleHealthInsuranceChange('self', e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-green-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max: ₹25,000</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Family Members</label>
                  <input
                    type="number"
                    value={formData.healthInsurance.familyMembers}
                    onChange={(e) => handleHealthInsuranceChange('familyMembers', e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-green-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max: ₹25,000</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Parents (Below 60)</label>
                  <input
                    type="number"
                    value={formData.healthInsurance.parents}
                    onChange={(e) => handleHealthInsuranceChange('parents', e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-green-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max: ₹25,000</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Parents (60+)</label>
                  <input
                    type="number"
                    value={formData.healthInsurance.parentsAbove60}
                    onChange={(e) => handleHealthInsuranceChange('parentsAbove60', e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-green-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max: ₹30,000</p>
                </div>
              </div>
            </div>

            {/* Section 80E & 80G */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4">
                <label className="block font-semibold text-white mb-2">Section 80E - Student Loan Interest (Max: ₹50,000)</label>
                <input
                  type="number"
                  value={formData.studentLoanInterest.amount}
                  onChange={(e) => handleOtherDeductionChange('studentLoanInterest', e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-green-500"
                />
              </div>

              <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4">
                <label className="block font-semibold text-white mb-2">Section 80G - Charity Donations (No Limit)</label>
                <input
                  type="number"
                  value={formData.charityDonations.amount}
                  onChange={(e) => handleOtherDeductionChange('charityDonations', e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-green-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition font-medium"
              >
                Calculate & Save
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Results Section */}
      {taxData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-700/30 rounded-lg p-6">
              <p className="text-gray-400 text-sm">Gross Income</p>
              <p className="text-2xl font-bold text-blue-400 mt-2">₹{taxData.annualIncome.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-700/30 rounded-lg p-6">
              <p className="text-gray-400 text-sm">Total Deductions</p>
              <p className="text-2xl font-bold text-purple-400 mt-2">₹{taxData.totalDeductions.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-900/30 to-orange-800/20 border border-orange-700/30 rounded-lg p-6">
              <p className="text-gray-400 text-sm">Taxable Income</p>
              <p className="text-2xl font-bold text-orange-400 mt-2">₹{taxData.taxableIncome.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-gradient-to-br from-red-900/30 to-red-800/20 border border-red-700/30 rounded-lg p-6">
              <p className="text-gray-400 text-sm">Est. Tax Liability</p>
              <p className="text-2xl font-bold text-red-400 mt-2">₹{taxData.estimatedTaxLiability.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Tax Savings Highlight */}
          <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-green-700/50 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="text-green-400" size={28} />
              <h3 className="text-2xl font-bold text-green-400">Estimated Tax Savings: ₹{taxData.estimatedSavings.toLocaleString('en-IN')}</h3>
            </div>
            <p className="text-gray-300">By utilizing available tax deductions and optimal investment strategies</p>
          </div>

          {/* Deduction Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Section 80C */}
            <div
              className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 cursor-pointer hover:border-blue-700 transition"
              onClick={() => setExpandedSection(expandedSection === '80C' ? null : '80C')}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-white">Section 80C</h4>
                <p className="text-blue-400 font-semibold">₹{taxData.totalSection80CDeduction.toLocaleString('en-IN')}</p>
              </div>
              <p className="text-xs text-gray-400 mt-1">Max Limit: ₹1,50,000</p>

              {expandedSection === '80C' && (
                <div className="mt-4 space-y-2 border-t border-slate-700 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">PPF</span>
                    <span className="text-white">₹{taxData.taxSavingInvestments.ppf.invested.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">ELSS</span>
                    <span className="text-white">₹{taxData.taxSavingInvestments.elss.invested.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">NPS</span>
                    <span className="text-white">₹{taxData.taxSavingInvestments.nps.invested.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Life Insurance</span>
                    <span className="text-white">₹{taxData.taxSavingInvestments.lifeInsurance.invested.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Home Loan Interest</span>
                    <span className="text-white">₹{taxData.taxSavingInvestments.homeLoansInterest.invested.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Section 80D */}
            <div
              className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 cursor-pointer hover:border-red-700 transition"
              onClick={() => setExpandedSection(expandedSection === '80D' ? null : '80D')}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-white">Section 80D - Health Insurance</h4>
                <p className="text-red-400 font-semibold">₹{taxData.totalSection80DDeduction.toLocaleString('en-IN')}</p>
              </div>
              <p className="text-xs text-gray-400 mt-1">Max Limit: ₹1,00,000</p>

              {expandedSection === '80D' && (
                <div className="mt-4 space-y-2 border-t border-slate-700 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Self</span>
                    <span className="text-white">₹{taxData.healthInsurance.self.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Family</span>
                    <span className="text-white">₹{taxData.healthInsurance.familyMembers.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Parents</span>
                    <span className="text-white">₹{taxData.healthInsurance.parents.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Parents 60+</span>
                    <span className="text-white">₹{taxData.healthInsurance.parentsAbove60.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recommendations */}
          {taxData.recommendations && taxData.recommendations.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Lightbulb className="text-yellow-400" size={24} />
                Personalized Tax-Saving Recommendations
              </h3>

              <div className="space-y-3">
                {taxData.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className={`bg-slate-800/50 border rounded-lg p-4 ${
                      rec.priority === 'high'
                        ? 'border-green-700/50'
                        : rec.priority === 'medium'
                        ? 'border-yellow-700/50'
                        : 'border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-white capitalize">{rec.type.replace('_', ' ')}</h4>
                        <p className="text-sm text-gray-400 mt-1">{rec.description}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-lg font-bold text-green-400">₹{rec.amount.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-gray-500">Est. Benefit: ₹{rec.benefit.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ITR Ready Summary Section */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Download className="text-green-400" size={24} />
              ITR Ready Summary
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-400">Financial Year</p>
                <p className="text-white font-semibold">{taxData.financialYear}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Tax Regime</p>
                <p className="text-white font-semibold capitalize">{taxData.taxRegime.replace('_', ' ')}</p>
              </div>
            </div>
            <button
              onClick={downloadITRSummary}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition font-medium flex items-center justify-center gap-2"
            >
              <Download size={20} />
              Download ITR Summary as CSV
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!taxData && !showForm && (
        <div className="text-center py-12 bg-slate-800/50 border border-slate-700 rounded-lg">
          <Calculator size={40} className="mx-auto text-gray-500 mb-3" />
          <p className="text-gray-400">No tax data yet. Enter your income details to get started.</p>
        </div>
      )}
    </div>
  )
}
