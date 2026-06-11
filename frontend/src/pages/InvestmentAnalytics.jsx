import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { 
    TrendingUp, TrendingDown, Briefcase, Activity, Calendar, 
    ArrowLeft, PieChart as PieIcon, RefreshCw, BarChart2, ShieldAlert,
    Info, LayoutGrid, Users, DollarSign, Wallet
} from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
    ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell, 
    ReferenceLine, PieChart, Pie
} from 'recharts';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function InvestmentAnalytics() {
    const [mode, setMode] = useState('personal'); // 'personal' | 'family'
    const [familyGroups, setFamilyGroups] = useState([]);
    const [selectedFamilyId, setSelectedFamilyId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [analyticsData, setAnalyticsData] = useState(null);
    const [chartLayout, setChartLayout] = useState('grid'); // 'grid' | 'detailed'
    const [activeDetailedChart, setActiveDetailedChart] = useState('growth');

    const token = localStorage.getItem('token');
    const getAuthHeader = () => token ? { Authorization: `Bearer ${token}` } : {};

    // Colors for assets
    const ASSET_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#64748b'];

    // Fetch initial setup (family groups)
    useEffect(() => {
        const fetchFamilyData = async () => {
            try {
                const res = await axios.get(`${API_URL}/family/my-families`, {
                    headers: getAuthHeader()
                });
                if (res.data.success && res.data.data.length > 0) {
                    setFamilyGroups(res.data.data);
                    setSelectedFamilyId(res.data.data[0]._id);
                }
            } catch (err) {
                console.error('Error fetching family groups:', err);
            }
        };
        fetchFamilyData();
    }, []);

    // Fetch analytics data when mode or selectedFamilyId changes
    const fetchAnalytics = async () => {
        setLoading(true);
        setError(null);
        try {
            let url = `${API_URL}/investment/analytics?mode=${mode}`;
            if (mode === 'family' && selectedFamilyId) {
                url += `&familyId=${selectedFamilyId}`;
            }

            const res = await axios.get(url, {
                headers: getAuthHeader()
            });

            if (res.data.success) {
                setAnalyticsData(res.data.data);
            }
        } catch (err) {
            console.error('Error fetching analytics:', err);
            setError(err.response?.data?.message || 'Failed to load portfolio analytics.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [mode, selectedFamilyId]);

    // Format helpers
    const formatCurrency = (val) => {
        return '₹' + Number(val || 0).toLocaleString('en-IN', {
            maximumFractionDigits: 0
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
                <RefreshCw className="animate-spin text-blue-600 mb-4" size={40} />
                <h2 className="text-xl font-bold text-slate-800 animate-pulse">Analyzing Portfolio Growth...</h2>
                <p className="text-slate-500 mt-2">Computing assets, sector weights, and historical returns...</p>
            </div>
        );
    }

    const { summary = {}, assetAllocation = [], sectorAllocation = [], portfolioGrowth = [], monthlyReturns = [] } = analyticsData || {};

    const profitLossTotal = summary.totalProfitLoss || 0;
    const isProfitable = profitLossTotal >= 0;

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-16 px-4">
            
            {/* Header controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
                <div>
                    <Link to="/investments" className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline mb-2">
                        <ArrowLeft size={14} /> Back to Holdings
                    </Link>
                    <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-2xl">
                            <Activity size={28} />
                        </div>
                        Portfolio Wealth Analytics
                    </h1>
                </div>

                {/* Portfolio Type selector */}
                <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto">
                    <button
                        onClick={() => setMode('personal')}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-extrabold transition-all text-sm ${mode === 'personal' ? 'bg-white text-blue-700 shadow-md' : 'text-slate-600 hover:text-slate-800'}`}
                    >
                        <Briefcase size={16} /> Personal
                    </button>
                    {familyGroups.length > 0 && (
                        <button
                            onClick={() => setMode('family')}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-extrabold transition-all text-sm ${mode === 'family' ? 'bg-white text-indigo-700 shadow-md' : 'text-slate-600 hover:text-slate-800'}`}
                        >
                            <Users size={16} /> Family Group
                        </button>
                    )}
                </div>
            </div>

            {/* Select family group dropdown (if in family mode) */}
            {mode === 'family' && familyGroups.length > 1 && (
                <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex items-center gap-4 max-w-md animate-in slide-in-from-top-4 duration-300">
                    <label className="text-sm font-extrabold text-slate-700 whitespace-nowrap">Selected Family Group:</label>
                    <select
                        value={selectedFamilyId}
                        onChange={(e) => setSelectedFamilyId(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-800"
                    >
                        {familyGroups.map(grp => (
                            <option key={grp._id} value={grp._id}>{grp.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl">
                    <ShieldAlert className="flex-shrink-0" />
                    <span className="font-semibold">{error}</span>
                </div>
            )}

            {/* KPI Cards Ribbon */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                {/* Net Asset Worth */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 text-indigo-600 group-hover:scale-110 transition-transform">
                        <Wallet size={64} />
                    </div>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-2">Net Portfolio Value</p>
                    <h3 className="text-3xl font-black text-slate-950">{formatCurrency(summary.totalCurrentValue)}</h3>
                    <p className="text-[10px] text-slate-500 font-semibold mt-2.5">Combined valuation today</p>
                </div>

                {/* Total Capital Invested */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 text-slate-600 group-hover:scale-110 transition-transform">
                        <DollarSign size={64} />
                    </div>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-2">Invested Capital</p>
                    <h3 className="text-3xl font-black text-slate-950">{formatCurrency(summary.totalInvested)}</h3>
                    <p className="text-[10px] text-slate-500 font-semibold mt-2.5">Total initial cost of holdings</p>
                </div>

                {/* Total Profit/Loss */}
                <div className={`rounded-3xl p-6 border relative overflow-hidden group transition-all duration-300
                    ${isProfitable ? 'bg-emerald-50/50 border-emerald-100 text-emerald-950' : 'bg-rose-50/50 border-rose-100 text-rose-950'}`}>
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        {isProfitable ? <TrendingUp size={64} className="text-emerald-500" /> : <TrendingDown size={64} className="text-rose-500" />}
                    </div>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-2">Total Yield Return</p>
                    <h3 className="text-3xl font-black">{isProfitable ? '+' : ''}{formatCurrency(profitLossTotal)}</h3>
                    <span className={`inline-flex items-center text-[10px] font-black mt-2.5 px-2 py-0.5 rounded-full
                        ${isProfitable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {summary.totalInvested > 0 ? (summary.profitLossPercentage).toFixed(2) : 0}% Yield
                    </span>
                </div>

                {/* MoM Performance Average */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 text-blue-600 group-hover:scale-110 transition-transform">
                        <Calendar size={64} />
                    </div>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-2">MoM Growth Avg</p>
                    {(() => {
                        const avg = monthlyReturns.reduce((sum, r) => sum + r.returns, 0) / (monthlyReturns.length || 1);
                        const isAvgUp = avg >= 0;
                        return (
                            <>
                                <h3 className={`text-3xl font-black ${isAvgUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {isAvgUp ? '+' : ''}{avg.toFixed(2)}%
                                </h3>
                                <p className="text-[10px] text-slate-500 font-semibold mt-2.5">Average monthly return rate</p>
                            </>
                        );
                    })()}
                </div>
            </div>

            {/* Layout Switcher (Grid vs. Detailed View Selector) */}
            <div className="flex justify-between items-center bg-slate-50 border border-slate-200/60 px-6 py-4 rounded-3xl">
                <span className="text-slate-700 font-extrabold text-sm flex items-center gap-2">
                    <BarChart2 size={18} className="text-blue-600" />
                    Interactive Chart Visualizations
                </span>
                
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setChartLayout('grid')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${chartLayout === 'grid' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200/60'}`}
                    >
                        <LayoutGrid size={14} /> Matrix Grid
                    </button>
                    <button
                        onClick={() => setChartLayout('detailed')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${chartLayout === 'detailed' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200/60'}`}
                    >
                        <PieIcon size={14} /> Full View
                    </button>
                </div>
            </div>

            {/* Simulated Data Disclaimer banner */}
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-xs flex items-start gap-3 leading-relaxed">
                <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                    <strong>Simulated Historical Forecasts:</strong> To deliver comprehensive reports without legacy database friction, growth timelines are back-calculated dynamically using asset purchase dates, risk weight compound indices, and sector metrics.
                </div>
            </div>

            {/* CHARTS CONTAINER */}
            {chartLayout === 'grid' ? (
                /* MATRIX GRID LAYOUT */
                <div className="space-y-8 animate-in fade-in duration-300">
                    
                    {/* Row 1: Portfolio Growth (2/3) and Asset Allocation (1/3) */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
                            <div>
                                <h4 className="text-lg font-bold text-slate-800">Portfolio Net Valuation Growth</h4>
                                <p className="text-xs text-slate-400 font-semibold">Total capital invested vs current market valuation trend</p>
                            </div>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={portfolioGrowth} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="growthVal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => formatCurrency(v)} />
                                        <Tooltip formatter={(v) => [formatCurrency(v)]} contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }} />
                                        <Legend verticalAlign="top" height={36} iconType="circle" />
                                        <Area name="Current Asset Value" type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#growthVal)" />
                                        <Line name="Invested Capital" type="monotone" dataKey="invested" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Asset Donut Chart */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
                            <div>
                                <h4 className="text-lg font-bold text-slate-800">Asset Class Allocation</h4>
                                <p className="text-xs text-slate-400 font-semibold">Asset split percentage weighting</p>
                            </div>
                            
                            {assetAllocation.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 italic font-semibold text-sm">No assets mapped.</div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="h-52">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={assetAllocation}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={55}
                                                    outerRadius={75}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                >
                                                    {assetAllocation.map((entry, idx) => (
                                                        <Cell key={`cell-${idx}`} fill={ASSET_COLORS[idx % ASSET_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(v) => [formatCurrency(v), 'Current Value']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                                        {assetAllocation.map((item, idx) => (
                                            <div key={item.name} className="flex items-center gap-1.5">
                                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: ASSET_COLORS[idx % ASSET_COLORS.length] }} />
                                                <span className="text-slate-600 truncate">{item.name}: {item.percentage}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Row 2: Profit/Loss Trend (1/2) and Sector Allocation (1/2) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* P/L Area Chart */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
                            <div>
                                <h4 className="text-lg font-bold text-slate-800">Net Profit / Loss Trend</h4>
                                <p className="text-xs text-slate-400 font-semibold">Historical value gain/drawdowns over timeline</p>
                            </div>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={portfolioGrowth} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="plGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => formatCurrency(v)} />
                                        <Tooltip formatter={(v) => [formatCurrency(v), 'P/L']} />
                                        <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1.5} />
                                        <Area name="Net Profit/Loss" type="monotone" dataKey="profitLoss" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#plGrad)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Sector Allocation Horizontal Bar Chart */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
                            <div>
                                <h4 className="text-lg font-bold text-slate-800">Sectoral Distribution</h4>
                                <p className="text-xs text-slate-400 font-semibold">Holdings concentration categorized by industry sectors</p>
                            </div>
                            
                            {sectorAllocation.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 italic font-semibold text-sm">No equity/sectors found.</div>
                            ) : (
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={sectorAllocation} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                            <XAxis type="number" stroke="#94a3b8" fontSize={10} tickFormatter={(v) => formatCurrency(v)} tickLine={false} />
                                            <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} width={100} />
                                            <Tooltip formatter={(v) => [formatCurrency(v), 'Allocated']} />
                                            <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                                                {sectorAllocation.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={ASSET_COLORS[index % ASSET_COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Row 3: Monthly Returns Bar Chart */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
                        <div>
                            <h4 className="text-lg font-bold text-slate-800">Monthly Yield Returns (%)</h4>
                            <p className="text-xs text-slate-400 font-semibold">Month-over-month percentage returns</p>
                        </div>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyReturns} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${v}%`} />
                                    <Tooltip formatter={(v) => [`${v}%`, 'Return Rate']} />
                                    <ReferenceLine y={0} stroke="#94a3b8" />
                                    <Bar dataKey="returns" radius={[8, 8, 0, 0]}>
                                        {monthlyReturns.map((entry, idx) => {
                                            const isUp = entry.returns >= 0;
                                            return <Cell key={`cell-${idx}`} fill={isUp ? '#10b981' : '#f43f5e'} />;
                                        })}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>
            ) : (
                /* DETAILED / SINGLE FULL VIEW LAYOUT */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
                    
                    {/* Left Sidebar selectors */}
                    <div className="lg:col-span-3 space-y-3">
                        {[
                            { id: 'growth', label: 'Portfolio Growth', desc: 'Invested vs current valuation', icon: <TrendingUp size={16} /> },
                            { id: 'pl', label: 'Profit / Loss Trend', desc: 'Net gains over timeline', icon: <Activity size={16} /> },
                            { id: 'assets', label: 'Asset Allocation', desc: 'Asset weighting splits', icon: <PieIcon size={16} /> },
                            { id: 'sectors', label: 'Sector Allocation', desc: 'Sectorial distribution', icon: <BarChart2 size={16} /> },
                            { id: 'returns', label: 'Monthly Returns', desc: 'Month-over-Month return rates', icon: <Calendar size={16} /> }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveDetailedChart(tab.id)}
                                className={`w-full text-left p-4 rounded-2xl border transition-all ${activeDetailedChart === tab.id ? 'bg-blue-50 border-blue-200 text-blue-900 shadow-md translate-x-2' : 'bg-white border-slate-200/60 hover:bg-slate-50'}`}
                            >
                                <div className="flex items-center gap-2 font-extrabold text-sm mb-1">
                                    {tab.icon} {tab.label}
                                </div>
                                <div className="text-[10px] font-semibold text-slate-400 ml-6">{tab.desc}</div>
                            </button>
                        ))}
                    </div>

                    {/* Right Chart viewer */}
                    <div className="lg:col-span-9 bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm min-h-[450px] flex flex-col justify-between">
                        {activeDetailedChart === 'growth' && (
                            <div className="space-y-6 h-full flex flex-col justify-between">
                                <div>
                                    <h4 className="text-xl font-bold text-slate-800">Portfolio Net Valuation Growth</h4>
                                    <p className="text-xs text-slate-400 font-semibold mt-1">Growth progression of your total capital invested vs current market asset value.</p>
                                </div>
                                <div className="h-96">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={portfolioGrowth}>
                                            <defs>
                                                <linearGradient id="detailedGrowth" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="name" stroke="#94a3b8" />
                                            <YAxis stroke="#94a3b8" tickFormatter={(v) => formatCurrency(v)} />
                                            <Tooltip formatter={(v) => [formatCurrency(v)]} />
                                            <Legend height={36} />
                                            <Area name="Current Asset Value" type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#detailedGrowth)" />
                                            <Line name="Invested Capital" type="monotone" dataKey="invested" stroke="#64748b" strokeWidth={2} strokeDasharray="6 6" dot={false} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {activeDetailedChart === 'pl' && (
                            <div className="space-y-6 h-full flex flex-col justify-between">
                                <div>
                                    <h4 className="text-xl font-bold text-slate-800">Net Profit / Loss Value Trend</h4>
                                    <p className="text-xs text-slate-400 font-semibold mt-1">Historical value accumulation above or below capital investments.</p>
                                </div>
                                <div className="h-96">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={portfolioGrowth}>
                                            <defs>
                                                <linearGradient id="detailedPL" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="name" stroke="#94a3b8" />
                                            <YAxis stroke="#94a3b8" tickFormatter={(v) => formatCurrency(v)} />
                                            <Tooltip formatter={(v) => [formatCurrency(v)]} />
                                            <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} />
                                            <Area name="Net Profit/Loss" type="monotone" dataKey="profitLoss" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#detailedPL)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {activeDetailedChart === 'assets' && (
                            <div className="space-y-6 h-full flex flex-col justify-between">
                                <div>
                                    <h4 className="text-xl font-bold text-slate-800">Asset Class Weighting Split</h4>
                                    <p className="text-xs text-slate-400 font-semibold mt-1">Donut representation of asset distributions.</p>
                                </div>
                                
                                {assetAllocation.length === 0 ? (
                                    <div className="text-center py-20 text-slate-400 italic">No asset configuration found.</div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                        <div className="h-80">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={assetAllocation}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={70}
                                                        outerRadius={95}
                                                        paddingAngle={4}
                                                        dataKey="value"
                                                    >
                                                        {assetAllocation.map((entry, idx) => (
                                                            <Cell key={`cell-${idx}`} fill={ASSET_COLORS[idx % ASSET_COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(v) => [formatCurrency(v), 'Current Value']} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="space-y-4">
                                            <h5 className="font-extrabold text-slate-700 text-sm uppercase tracking-wide">Allocation Ledger</h5>
                                            <div className="space-y-2">
                                                {assetAllocation.map((item, idx) => (
                                                    <div key={item.name} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition-all">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: ASSET_COLORS[idx % ASSET_COLORS.length] }} />
                                                            <span className="text-sm font-bold text-slate-700">{item.name}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-black text-slate-800">{formatCurrency(item.value)}</p>
                                                            <p className="text-[10px] font-bold text-slate-400">{item.percentage}% Allocation</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeDetailedChart === 'sectors' && (
                            <div className="space-y-6 h-full flex flex-col justify-between">
                                <div>
                                    <h4 className="text-xl font-bold text-slate-800">Sectoral Allocation weights</h4>
                                    <p className="text-xs text-slate-400 font-semibold mt-1">Concentration of equity/mutual fund holdings across industries.</p>
                                </div>
                                
                                {sectorAllocation.length === 0 ? (
                                    <div className="text-center py-20 text-slate-400 italic">No stock/equity assets found.</div>
                                ) : (
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={sectorAllocation} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                                <XAxis type="number" stroke="#94a3b8" tickFormatter={(v) => formatCurrency(v)} />
                                                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={120} />
                                                <Tooltip formatter={(v) => [formatCurrency(v), 'Allocated']} />
                                                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                                                    {sectorAllocation.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={ASSET_COLORS[index % ASSET_COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeDetailedChart === 'returns' && (
                            <div className="space-y-6 h-full flex flex-col justify-between">
                                <div>
                                    <h4 className="text-xl font-bold text-slate-800">Month-over-Month Yield returns</h4>
                                    <p className="text-xs text-slate-400 font-semibold mt-1">MoM returns percentage scaling.</p>
                                </div>
                                <div className="h-96">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={monthlyReturns}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" stroke="#94a3b8" />
                                            <YAxis stroke="#94a3b8" tickFormatter={(v) => `${v}%`} />
                                            <Tooltip formatter={(v) => [`${v}%`, 'Return Rate']} />
                                            <ReferenceLine y={0} stroke="#94a3b8" />
                                            <Bar dataKey="returns" radius={[8, 8, 0, 0]}>
                                                {monthlyReturns.map((entry, idx) => {
                                                    const isUp = entry.returns >= 0;
                                                    return <Cell key={`cell-${idx}`} fill={isUp ? '#10b981' : '#f43f5e'} />;
                                                })}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            )}

            {/* DETAILED GROWTH PROJECTIONS LEDGER */}
            <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm overflow-hidden">
                <h4 className="text-lg font-bold text-slate-800 mb-4">Historical Progression Ledger</h4>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                            <tr>
                                <th className="p-4 rounded-l-xl">Timeline Month</th>
                                <th className="p-4">Invested Principal</th>
                                <th className="p-4">Portfolio Valuation</th>
                                <th className="p-4">Net Yield (₹)</th>
                                <th className="p-4 rounded-r-xl">Yield Yield (%)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-bold">
                            {portfolioGrowth.map((row, idx) => {
                                const diff = row.value - row.invested;
                                const isPos = diff >= 0;
                                return (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 text-slate-900">{row.name}</td>
                                        <td className="p-4">{formatCurrency(row.invested)}</td>
                                        <td className="p-4">{formatCurrency(row.value)}</td>
                                        <td className={`p-4 ${isPos ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {isPos ? '+' : ''}{formatCurrency(diff)}
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${isPos ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                                {row.profitLossPercent}%
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
