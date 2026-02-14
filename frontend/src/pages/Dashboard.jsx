import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, PiggyBank, Wallet, RefreshCw, Activity, ArrowUpRight, ArrowDownRight, CreditCard, DollarSign } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export default function Dashboard() {
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token) {
            navigate('/login');
            return;
        }

        setUser(userData ? JSON.parse(userData) : null);
        fetchDashboardData(token);

        const interval = setInterval(() => {
            fetchDashboardData(token);
        }, 30000); // Increased refresh rate to 30s to reduce load

        return () => clearInterval(interval);
    }, [navigate]);

    const fetchDashboardData = async (token) => {
        try {
            setRefreshing(true);
            const response = await axios.get(`${API_URL}/dashboard/summary`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSummary(response.data.summary);
        } catch (error) {
            console.error('Error fetching dashboard:', error);
            if (error.response?.status === 401) navigate('/login');
        } finally {
            setRefreshing(false);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <div className="mt-4 text-slate-500 font-medium">Loading Overview...</div>
                </div>
            </div>
        );
    }

    const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

    // Main Stats
    const summaryData = [
        { 
            title: 'Total Income', 
            amount: summary?.totalIncome, 
            icon: TrendingUp, 
            color: 'text-emerald-600', 
            bg: 'bg-emerald-50',
            trend: '+12%', // Mock data for visual
            trendUp: true 
        },
        { 
            title: 'Total Expenses', 
            amount: summary?.totalExpense, 
            icon: TrendingDown, 
            color: 'text-rose-600', 
            bg: 'bg-rose-50',
            trend: '+5%', 
            trendUp: true // Expense going up is usually bad visually, but logically correct
        },
        { 
            title: 'Net Savings', 
            amount: summary?.totalSavings, 
            icon: PiggyBank, 
            color: 'text-blue-600', 
            bg: 'bg-blue-50',
            trend: '+8%', 
            trendUp: true 
        },
        { 
            title: 'Current Balance', 
            amount: summary?.netBalance, 
            icon: Wallet, 
            color: 'text-indigo-600', 
            bg: 'bg-indigo-50',
            trend: '+2%', 
            trendUp: true 
        },
    ];

    const secondaryStats = [
        { title: 'Invested Value', amount: summary?.totalInvestmentValue, icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
        { title: 'Goal Progress', amount: summary?.totalInvestment, icon: DollarSign, color: 'text-cyan-600', bg: 'bg-cyan-50' },
        { title: 'Debt Remaining', amount: summary?.totalLoanRemaining, icon: CreditCard, color: 'text-orange-600', bg: 'bg-orange-50' },
        { title: 'Total Liabilities', amount: summary?.totalLoanAmount, icon: TrendingDown, color: 'text-slate-600', bg: 'bg-slate-100' },
    ];

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-10">
            {/* Header / Welcome */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 p-1">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        Dashboard
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Welcome back, <span className="font-semibold text-slate-700">{user?.fullName}</span>. Here's your financial summary.
                    </p>
                </div>
                <button
                    onClick={() => {
                         const token = localStorage.getItem('token');
                         fetchDashboardData(token);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 rounded-lg shadow-sm transition-all active:scale-95 text-sm font-medium"
                >
                    <RefreshCw size={16} className={`${refreshing ? 'animate-spin' : ''}`} />
                    Refresh Data
                </button>
            </div>

            {/* Primary Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {summaryData.map((item, index) => (
                    <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100/50 hover:shadow-md transition-shadow group">
                        <div className="flex justify-between items-start">
                            <div className={`p-3 rounded-xl ${item.bg} ${item.color} group-hover:scale-110 transition-transform duration-300`}>
                                <item.icon size={24} />
                            </div>
                            {item.trend && (
                                <div className={`flex items-center text-xs font-semibold px-2 py-1 rounded-full ${item.trendUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                    {item.trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                    {item.trend}
                                </div>
                            )}
                        </div>
                        <div className="mt-4">
                            <p className="text-slate-500 text-sm font-medium">{item.title}</p>
                            <h3 className="text-2xl font-bold text-slate-900 mt-1">
                                ₹{(item.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Income vs Source - Bar Chart */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800">Income Overview</h3>
                        <div className="bg-slate-50 px-3 py-1 rounded-lg text-xs font-medium text-slate-500">This Month</div>
                    </div>
                    
                    <div className="h-[300px] w-full">
                        {(!summary?.incomeBySource || summary.incomeBySource.length === 0) ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <Activity size={40} className="mb-2 opacity-50"/>
                                <p>No income data recorded yet</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={summary.incomeBySource} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="_id" 
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                        dy={10}
                                        tickFormatter={(val) => val.charAt(0).toUpperCase() + val.slice(1)}
                                    />
                                    <YAxis 
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                        tickFormatter={(value) => `₹${value/1000}k`}
                                    />
                                    <Tooltip 
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar 
                                        dataKey="total" 
                                        fill="#10b981" 
                                        radius={[6, 6, 0, 0]}
                                        barSize={40}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Expenses - Pie Chart */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Expenses Breakdown</h3>
                    <p className="text-sm text-slate-500 mb-6">Where your money is going</p>
                    
                    <div className="h-[250px] w-full relative">
                        {(!summary?.expenseByCategory || summary.expenseByCategory.length === 0) ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <DollarSign size={40} className="mb-2 opacity-50"/>
                                <p>No expense data yet</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={summary.expenseByCategory}
                                        dataKey="total"
                                        nameKey="_id"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                    >
                                        {summary.expenseByCategory.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(value) => `₹${value.toLocaleString()}`}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                        {/* Legend */}
                        {summary?.expenseByCategory?.length > 0 && (
                             <div className="flex flex-wrap justify-center gap-2 mt-4 max-h-[100px] overflow-y-auto custom-scrollbar">
                                 {summary.expenseByCategory.map((entry, index) => (
                                     <div key={index} className="flex items-center gap-1.5 text-xs text-slate-600">
                                         <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                         <span className="capitalize">{entry._id}: {((entry.total / summary.totalExpense) * 100).toFixed(0)}%</span>
                                     </div>
                                 ))}
                             </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Secondary Stats/Overview */}
            <div>
                 <h2 className="text-lg font-bold text-slate-800 mb-4 px-1">Portfolio Snapshot</h2>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {secondaryStats.map((item, index) => (
                        <div key={index} className="bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-4 hover:border-slate-200 transition-colors">
                            <div className={`p-3 rounded-full ${item.bg} ${item.color}`}>
                                <item.icon size={20} />
                            </div>
                            <div>
                                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{item.title}</p>
                                <p className="text-slate-900 font-bold text-lg">₹{(item.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                            </div>
                        </div>
                    ))}
                 </div>
            </div>
        </div>
    );
}
