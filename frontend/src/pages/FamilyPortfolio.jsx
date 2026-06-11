import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  TrendingUp, TrendingDown, Users, PieChart as PieChartIcon, 
  Activity, Landmark, Coins, ShieldAlert, KeyRound, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer 
} from 'recharts';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const FamilyPortfolio = ({ familyId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unauthorized, setUnauthorized] = useState(false);

  const fetchFamilyPortfolio = async () => {
    setLoading(true);
    setError('');
    setUnauthorized(false);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/family/portfolio/${familyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setUnauthorized(true);
      } else {
        setError(err.response?.data?.message || 'Failed to fetch family portfolio data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (familyId) {
      fetchFamilyPortfolio();
    }
  }, [familyId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 mt-4 font-semibold text-sm">Aggregating family investment portfolios...</p>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-4">
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-5 border border-rose-100">
          <KeyRound size={28} />
        </div>
        <h3 className="text-xl font-extrabold text-slate-900 mb-2">Access Denied</h3>
        <p className="text-slate-500 text-sm leading-relaxed mb-6">
          You do not have permission to view the Family Investment portfolio. Please contact your family admin to enable investment sharing permissions.
        </p>
        <button 
          onClick={fetchFamilyPortfolio}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/10 text-sm active:scale-95"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 px-4">
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-5">
          <ShieldAlert size={28} />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">System Interruption</h3>
        <p className="text-slate-500 text-sm mb-6">{error}</p>
        <button 
          onClick={fetchFamilyPortfolio}
          className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all text-sm"
        >
          Refresh Feed
        </button>
      </div>
    );
  }

  const { summary, memberContributions, allocation, investments } = data || {};
  const isProfitable = summary?.totalProfitLoss >= 0;

  // Format Helper
  const formatINR = (val) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    });
  };

  const getTypeLabel = (type) => {
    const labels = {
      'stocks': 'Stocks',
      'mutual_funds': 'Mutual Funds',
      'crypto': 'Cryptocurrency',
      'bonds': 'Bonds',
      'real_estate': 'Real Estate',
      'other': 'Other'
    };
    return labels[type] || type;
  };

  // Recharts color palette
  const COLORS = ['#4f46e5', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#64748b'];

  // Prepare allocation chart data
  const pieData = allocation?.map(item => ({
    name: getTypeLabel(item.type),
    value: item.totalCurrentValue
  })) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500 text-slate-900">
            <Coins size={72} />
          </div>
          <div>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2">Total Family Invested</p>
            <h3 className="text-2xl font-black text-slate-950">{formatINR(summary?.totalInvested)}</h3>
            <p className="text-slate-400 text-[11px] font-semibold mt-2.5">Consolidated capital input</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500 text-slate-900">
            <Activity size={72} />
          </div>
          <div>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2">Family Portfolio Valuation</p>
            <h3 className="text-2xl font-black text-slate-950">{formatINR(summary?.totalCurrentValue)}</h3>
            <p className="text-slate-400 text-[11px] font-semibold mt-2.5">Current market value</p>
          </div>
        </div>

        <div className={`rounded-2xl p-6 shadow-sm border relative overflow-hidden group transition-all duration-300
          ${isProfitable 
            ? 'bg-emerald-50/50 border-emerald-100 text-emerald-950' 
            : 'bg-rose-50/50 border-rose-100 text-rose-950'}`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            {isProfitable ? <TrendingUp size={72} className="text-emerald-500" /> : <TrendingDown size={72} className="text-rose-500" />}
          </div>
          <div>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2">Family Profit / Loss</p>
            <h3 className="text-2xl font-black flex items-center gap-1.5">
              {isProfitable ? '+' : ''}{formatINR(summary?.totalProfitLoss)}
            </h3>
            <span className={`inline-flex items-center gap-0.5 text-xs font-extrabold mt-2.5 px-2 py-0.5 rounded-full
              ${isProfitable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              {summary?.profitLossPercentage?.toFixed(2)}% Consolidated Return
            </span>
          </div>
        </div>
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Allocation */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm">
          <h2 className="text-lg font-extrabold text-slate-900 mb-5 flex items-center gap-2">
            <Landmark size={18} className="text-indigo-600" />
            Consolidated Asset Distribution
          </h2>
          
          {pieData.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-semibold text-sm">
              No family assets synced. Share assets in Sharing Settings.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => [formatINR(val), 'Value']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {allocation.map((item, idx) => (
                  <div key={item.type} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-xl transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-xs font-bold text-slate-700">{getTypeLabel(item.type)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-slate-900">{formatINR(item.totalCurrentValue)}</span>
                      <span className="text-[10px] text-slate-400 block font-semibold">{item.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Member-wise Contribution */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 mb-5 flex items-center gap-2">
              <Users size={18} className="text-blue-600" />
              Member Contributions Summary
            </h2>

            {(() => {
              const memberPieData = memberContributions?.map(member => ({
                name: member.name,
                value: member.totalCurrentValue
              })).filter(item => item.value > 0) || [];

              if (memberPieData.length === 0) {
                return (
                  <div className="text-center py-12 text-slate-400 font-semibold text-sm">
                    No active member contributions found.
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={memberPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {memberPieData.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={COLORS[(idx + 2) % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val) => [formatINR(val), 'Contribution Value']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {memberContributions?.map((member, idx) => {
                      const isUp = member.profitLoss >= 0;
                      const totalVal = summary?.totalCurrentValue || 1;
                      const pct = ((member.totalCurrentValue / totalVal) * 100).toFixed(1);
                      return (
                        <div key={member.userId} className="flex justify-between items-center p-2.5 hover:bg-slate-50/50 rounded-xl border border-slate-100/50 transition-colors">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[(idx + 2) % COLORS.length] }} />
                              <span className="font-extrabold text-slate-900 text-xs block">{member.name}</span>
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase mt-1 inline-block">{member.role}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-slate-900 text-xs block">{formatINR(member.totalCurrentValue)}</span>
                            <div className="flex items-center gap-1 justify-end mt-0.5">
                              <span className="text-[9px] text-slate-400 font-semibold">{pct}% share</span>
                              {member.totalInvested > 0 && (
                                <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1 rounded
                                  ${isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                  {isUp ? '+' : ''}{member.profitLossPercentage?.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

      </div>

      {/* Shared Assets Inventory */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Landmark size={18} className="text-emerald-600" />
            Shared Portfolio Assets Inventory
          </h2>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl">
            {investments?.length || 0} Synced Assets
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {investments?.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Coins size={44} className="mx-auto mb-3 opacity-25 text-indigo-400 animate-bounce" />
              <h3 className="font-bold text-slate-700">No Shared Assets</h3>
              <p className="text-xs mt-1 max-w-sm mx-auto">Configure shared individual holdings under "Sharing Settings" or align assets with the family group.</p>
            </div>
          ) : (
            investments?.map((inv) => {
              const profit = inv.currentValue - inv.amount;
              const roi = inv.amount > 0 ? ((inv.currentValue - inv.amount) / inv.amount * 100).toFixed(1) : 0;
              const isUp = profit >= 0;

              return (
                <div key={inv._id} className="p-5 hover:bg-slate-50/30 transition-colors">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-base">{inv.name}</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase tracking-wider">{getTypeLabel(inv.type)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 font-semibold">
                        <span>Contributed by:</span>
                        <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-lg">{inv.userId?.fullName || 'Family Admin'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 flex-shrink-0 self-end sm:self-center">
                      <div className="text-right">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Value / Cost</span>
                        <span className="font-black text-slate-900 text-sm">{formatINR(inv.currentValue)}</span>
                        <span className="text-xs text-slate-400 block font-semibold">Cost: {formatINR(inv.amount)}</span>
                      </div>
                      
                      <div className="text-right">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Return</span>
                        <span className={`font-black text-sm flex items-center justify-end gap-0.5
                          ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isUp ? '+' : ''}{roi}%
                        </span>
                        <span className={`text-[10px] block font-bold ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isUp ? '+' : ''}{formatINR(profit)}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

    </div>
  );
};

export default FamilyPortfolio;
