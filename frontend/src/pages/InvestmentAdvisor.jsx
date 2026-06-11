import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { 
  Sparkles, ArrowLeft, ArrowUpRight, ShieldAlert, Clock, HelpCircle,
  Coins, Activity, Landmark, Target, RefreshCw, CheckCircle2, ChevronRight, Info
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer 
} from 'recharts';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function InvestmentAdvisor() {
  // Input Form States
  const [formData, setFormData] = useState({
    userIncome: 120000,
    userExpenses: 60000,
    familyIncome: 0,
    familyExpenses: 0,
    riskProfile: 'medium',
    financialGoals: 'Buying a family home',
    investmentHorizon: 5,
    targetAmount: 5000000
  });

  // Response States
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('strategy');

  // Input Change Handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'riskProfile' || name === 'financialGoals' ? value : Number(value)
    }));
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/investment/advisor`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setResult(res.data);
      }
    } catch (err) {
      console.error('Error generating investment advice:', err);
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to generate investment recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Recharts Pie Colors
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Format Helper (INR currency formatting)
  const formatINR = (val) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    });
  };

  const getFeasibilityColor = (val) => {
    switch (val?.toLowerCase()) {
      case 'high': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'medium': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'low': return 'text-rose-700 bg-rose-50 border-rose-200';
      default: return 'text-slate-500 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link 
            to="/investments" 
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors mb-3"
          >
            <ArrowLeft size={14} /> Back to Investments
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl text-white shadow-md shadow-indigo-500/10">
              <Sparkles size={26} className="animate-pulse" />
            </div>
            AI Investment Advisor
          </h1>
          <p className="text-slate-500 mt-2 text-base">
            Get personalized portfolio allocations, tailored SIP plans, and timeline roadmaps powered by AI.
          </p>
        </div>
      </div>

      {/* Main Grid: Left inputs form, Right results report */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Form Panel (4/12 width) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Landmark size={20} className="text-indigo-500" />
              Financial & Risk Inputs
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-semibold">Enter your monthly capacity and target milestones.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* User Income & Expenses */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Your Income (₹/mo)</label>
                <input 
                  type="number"
                  name="userIncome"
                  value={formData.userIncome}
                  onChange={handleChange}
                  required
                  min="0"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Your Expenses (₹/mo)</label>
                <input 
                  type="number"
                  name="userExpenses"
                  value={formData.userExpenses}
                  onChange={handleChange}
                  required
                  min="0"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                />
              </div>
            </div>

            {/* Family Income & Expenses */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Family Income (Optional)</label>
                <input 
                  type="number"
                  name="familyIncome"
                  value={formData.familyIncome}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Family Expenses (Optional)</label>
                <input 
                  type="number"
                  name="familyExpenses"
                  value={formData.familyExpenses}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                />
              </div>
            </div>

            {/* Risk Profile & Horizon */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Risk Profile</label>
                <select 
                  name="riskProfile"
                  value={formData.riskProfile}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                >
                  <option value="low">Low (Conservative)</option>
                  <option value="medium">Medium (Moderate)</option>
                  <option value="high">High (Aggressive)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Horizon (Years)</label>
                <input 
                  type="number"
                  name="investmentHorizon"
                  value={formData.investmentHorizon}
                  onChange={handleChange}
                  required
                  min="1"
                  max="40"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                />
              </div>
            </div>

            {/* Financial Goal Name */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Financial Goal Target</label>
              <input 
                type="text"
                name="financialGoals"
                placeholder="e.g. Buying a house, Child higher education..."
                value={formData.financialGoals}
                onChange={handleChange}
                required
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
              />
            </div>

            {/* Target Goal Amount */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Target Amount (₹ - Optional)</label>
              <input 
                type="number"
                name="targetAmount"
                value={formData.targetAmount}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
              />
            </div>

            {/* Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:scale-[0.98] text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md shadow-indigo-500/10 text-sm cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  Analyzing Financials...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate Advisor Report
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm">
              <ShieldAlert className="flex-shrink-0 mt-0.5" size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Column: Advice Presentation (8/12 width) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Loading State Skeleton */}
          {loading && (
            <div className="bg-white rounded-3xl p-8 border border-slate-200/50 shadow-sm space-y-8 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-6 w-48 bg-slate-100 rounded-md"></div>
                <div className="h-6 w-32 bg-slate-100 rounded-md"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map(n => (
                  <div key={n} className="h-20 bg-slate-50 border border-slate-100 rounded-2xl"></div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="h-48 bg-slate-50 rounded-2xl"></div>
                <div className="space-y-4">
                  <div className="h-4 w-full bg-slate-100 rounded"></div>
                  <div className="h-4 w-5/6 bg-slate-100 rounded"></div>
                  <div className="h-4 w-4/5 bg-slate-100 rounded"></div>
                  <div className="h-4 w-2/3 bg-slate-100 rounded"></div>
                </div>
              </div>
            </div>
          )}

          {/* Initial State / Welcome Banner */}
          {!loading && !result && (
            <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/50 border border-indigo-100/50 rounded-3xl p-12 text-center shadow-sm max-w-2xl mx-auto">
              <div className="w-16 h-16 bg-white rounded-2xl border border-indigo-100 shadow-sm flex items-center justify-center mx-auto mb-6">
                <Sparkles className="text-indigo-600 animate-bounce" size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">Build Your Tailored Report</h3>
              <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto leading-relaxed">
                Provide your details in the inputs card on the left. The advisor will analyze your cash flows, compute risk score and horizon limits, and run goal models via AI to guide your investments.
              </p>
              <div className="flex items-center justify-center gap-8 border-t border-slate-100 pt-6 mt-2 text-left">
                <div className="flex items-center gap-2">
                  <Coins className="text-indigo-500" size={18} />
                  <div>
                    <span className="text-[10px] block font-bold text-slate-400 uppercase tracking-wider">Calculates</span>
                    <span className="text-xs font-bold text-slate-700">Savings & Risk Score</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="text-purple-500" size={18} />
                  <div>
                    <span className="text-[10px] block font-bold text-slate-400 uppercase tracking-wider">Models</span>
                    <span className="text-xs font-bold text-slate-700">Goal Feasibility</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Advice Dashboard Report */}
          {!loading && result && (
            <div className="space-y-6">
              
              {/* Section A: KPI Score Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Savings Capacity */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 relative">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Savings Capacity</span>
                  <h3 className="text-xl font-black text-slate-900">{formatINR(result.calculations.savingsCapacity)}<span className="text-xs font-bold text-slate-400">/mo</span></h3>
                  <p className="text-[10px] text-slate-500 mt-2 font-medium">Individual: {formatINR(result.calculations.individualSavingsCapacity)}</p>
                </div>

                {/* Risk Score */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 relative">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Calculated Risk Score</span>
                  <h3 className="text-xl font-black text-slate-900">{result.calculations.riskScore}<span className="text-xs font-bold text-slate-400">/100</span></h3>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full" 
                      style={{ width: `${result.calculations.riskScore}%` }}
                    />
                  </div>
                </div>

                {/* Goal Feasibility */}
                <div className={`rounded-2xl p-5 shadow-sm border relative ${getFeasibilityColor(result.calculations.goalFeasibility)}`}>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Goal Feasibility</span>
                  <h3 className="text-xl font-black">{result.calculations.goalFeasibility}</h3>
                  <p className="text-[9px] font-bold mt-2 truncate" title={result.calculations.feasibilityMessage}>
                    {result.calculations.requiredSIP > 0 ? `Required: ${formatINR(result.calculations.requiredSIP)}/mo` : 'Asset Creation feasibility'}
                  </p>
                </div>

              </div>

              {/* Goal Feasibility Detailed Message Callout */}
              <div className="bg-indigo-50/50 border border-indigo-100 text-indigo-950 p-4 rounded-2xl text-xs font-medium leading-relaxed flex items-start gap-2.5">
                <Info size={16} className="text-indigo-600 mt-0.5 flex-shrink-0" />
                <span>{result.calculations.feasibilityMessage}</span>
              </div>

              {/* Section B: Allocation Split & Pie Chart */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm">
                <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
                  <Landmark size={18} className="text-indigo-500" />
                  Proposed Portfolio Allocation
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  
                  {/* Recharts Pie */}
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={result.advice.portfolioAllocation}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="percentage"
                        >
                          {result.advice.portfolioAllocation.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Allocation Details */}
                  <div className="space-y-3">
                    {result.advice.portfolioAllocation.map((item, index) => (
                      <div key={item.assetClass} className="flex justify-between items-start p-2.5 hover:bg-slate-50 rounded-xl transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">{item.assetClass}</span>
                            <span className="text-[10px] text-slate-400 block font-semibold leading-normal">{item.description}</span>
                          </div>
                        </div>
                        <span className="text-sm font-black text-slate-900 flex-shrink-0">{item.percentage}%</span>
                      </div>
                    ))}
                  </div>

                </div>
              </div>

              {/* Section C: Tabbed recommendation details */}
              <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
                
                {/* Tabs */}
                <div className="flex border-b border-slate-100 bg-slate-50/50">
                  {['strategy', 'sip', 'roadmap', 'risk'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-3.5 text-xs font-bold transition-all border-b-2 capitalize outline-none cursor-pointer
                        ${activeTab === tab 
                          ? 'border-indigo-600 text-indigo-600 bg-white' 
                          : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                      {tab === 'sip' ? 'SIP Guide' : tab === 'roadmap' ? 'Feasibility Roadmap' : tab === 'risk' ? 'Risk analysis' : 'Core Strategy'}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="p-6">
                  
                  {/* Strategy */}
                  {activeTab === 'strategy' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <p className="text-slate-600 text-sm leading-relaxed font-medium">
                        {result.advice.investmentStrategy}
                      </p>
                    </div>
                  )}

                  {/* SIP Allocation */}
                  {activeTab === 'sip' && (
                    <div className="space-y-5 animate-in fade-in duration-200">
                      <div className="flex justify-between items-center p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                        <div>
                          <span className="block text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Recommended Monthly Investment</span>
                          <span className="text-lg font-black text-indigo-950">{formatINR(result.advice.sipRecommendation.totalMonthlySIP)}<span className="text-xs font-bold text-slate-400">/mo</span></span>
                        </div>
                        <CheckCircle2 className="text-indigo-500" size={24} />
                      </div>

                      <div className="space-y-3.5">
                        <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Recommended Allocation Splits</h4>
                        {result.advice.sipRecommendation.recommendedAllocations.map((sip, idx) => (
                          <div key={idx} className="p-4 border border-slate-100 rounded-2xl hover:border-slate-200 transition-colors flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <span className="text-xs font-black text-slate-800 block">{sip.category}</span>
                              <p className="text-xs text-slate-500 leading-normal font-medium">{sip.reason}</p>
                            </div>
                            <span className="text-sm font-black text-indigo-600 flex-shrink-0 bg-indigo-50/60 px-3 py-1 rounded-xl">
                              {formatINR(sip.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Roadmap */}
                  {activeTab === 'roadmap' && (
                    <div className="relative pl-6 border-l-2 border-indigo-100 ml-3 space-y-8 py-2 animate-in fade-in duration-200">
                      {result.advice.goalRoadmap.map((step, idx) => (
                        <div key={idx} className="relative group">
                          {/* Dot marker */}
                          <div className="absolute -left-[31px] top-1.5 w-4 h-4 bg-white border-2 border-indigo-500 rounded-full group-hover:bg-indigo-600 transition-colors" />
                          
                          <div className="space-y-1">
                            <span className="text-xs font-black text-indigo-600 uppercase tracking-wider block">{step.phase}</span>
                            <h4 className="text-xs font-bold text-slate-800">{step.action}</h4>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Risk analysis */}
                  {activeTab === 'risk' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl">
                        <ShieldAlert className="text-rose-500 mt-0.5 flex-shrink-0" size={18} />
                        <div>
                          <h4 className="text-xs font-black text-rose-950 uppercase tracking-wider mb-1">Volatility Analysis & Risk Factors</h4>
                          <p className="text-xs leading-relaxed font-semibold text-rose-900">{result.advice.riskAnalysis}</p>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Financial Disclaimer */}
              <div className="p-4 bg-slate-50 border border-slate-200/50 text-slate-500 rounded-2xl text-[10px] leading-relaxed font-semibold">
                <span className="font-extrabold uppercase text-slate-700 block mb-1">Financial Advisory Disclaimer</span>
                {result.advice.financialDisclaimer}
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
