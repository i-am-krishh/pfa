import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, PiggyBank, DollarSign, RefreshCw } from 'lucide-react';

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

        // Auto-refresh dashboard data every 5 seconds
        const interval = setInterval(() => {
            fetchDashboardData(token);
        }, 5000);

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
        } finally {
            setRefreshing(false);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 font-medium">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

    // Summary data with dynamic rendering
    const summaryData = [
        { title: 'Total Income', amount: summary?.totalIncome, icon: TrendingUp, color: 'from-green-400 to-green-600', light: 'bg-green-50' },
        { title: 'Total Expenses', amount: summary?.totalExpense, icon: TrendingDown, color: 'from-red-400 to-red-600', light: 'bg-red-50' },
        { title: 'Total Savings', amount: summary?.totalSavings, icon: PiggyBank, color: 'from-blue-400 to-blue-600', light: 'bg-blue-50' },
        { title: 'Net Balance', amount: summary?.netBalance, icon: DollarSign, color: 'from-purple-400 to-purple-600', light: 'bg-purple-50' },
    ];

    const investmentData = [
        { title: 'Total Investments', amount: summary?.totalInvestment, icon: TrendingUp, color: 'from-indigo-400 to-indigo-600', light: 'bg-indigo-50' },
        { title: 'Investment Value', amount: summary?.totalInvestmentValue, icon: DollarSign, color: 'from-cyan-400 to-cyan-600', light: 'bg-cyan-50' },
        { title: 'Total Loan Amount', amount: summary?.totalLoanAmount, icon: TrendingDown, color: 'from-orange-400 to-orange-600', light: 'bg-orange-50' },
        { title: 'Loan Remaining', amount: summary?.totalLoanRemaining, icon: PiggyBank, color: 'from-pink-400 to-pink-600', light: 'bg-pink-50' },
    ];

    return (
        <div className="space-y-8">
            {/* Welcome Section with Refresh Button */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 md:p-8 text-white shadow-lg flex items-center justify-between">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome back, {user?.fullName}!</h1>
                    <p className="text-blue-100">Here's your financial overview</p>
                </div>
                <button
                    onClick={() => {
                        const token = localStorage.getItem('token');
                        fetchDashboardData(token);
                    }}
                    disabled={refreshing}
                    className="ml-4 flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh dashboard data"
                >
                    <RefreshCw size={20} className={`${refreshing ? 'animate-spin' : ''}`} />
                    <span className="text-sm font-medium">{refreshing ? 'Updating...' : 'Refresh'}</span>
                </button>
            </div>

            {/* Primary Summary Cards - Responsive Grid */}
            <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Financial Overview</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {summaryData.map((item, index) => (
                        <SummaryCard key={index} {...item} />
                    ))}
                </div>
            </div>

            {/* Charts Section - Responsive Grid */}
            <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Analytics</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Expense by Category - Responsive Pie Chart */}
                    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-6">Expenses by Category</h3>
                        <div className="w-full h-80 flex items-center justify-center">
                            {(summary?.expenseByCategory?.length || 0) > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={summary?.expenseByCategory || []}
                                            dataKey="total"
                                            nameKey="_id"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={100}
                                            label={({ _id, total }) => `${_id}: ₹${total}`}
                                        >
                                            {(summary?.expenseByCategory || []).map((entry, idx) => (
                                                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-center text-slate-500">
                                    <p className="text-lg font-medium">No expense data available</p>
                                    <p className="text-sm">Start adding expenses to see analytics</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Income by Source - Responsive Bar Chart */}
                    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-6">Income by Source</h3>
                        <div className="w-full h-80 flex items-center justify-center">
                            {(summary?.incomeBySource?.length || 0) > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={summary?.incomeBySource || []}
                                        margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis
                                            dataKey="_id"
                                            angle={-45}
                                            textAnchor="end"
                                            height={80}
                                            tick={{ fill: '#64748b', fontSize: 12 }}
                                        />
                                        <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                            formatter={(value) => `₹${value.toFixed(2)}`}
                                            labelStyle={{ color: '#fff' }}
                                        />
                                        <Bar dataKey="total" fill="#10b981" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-center text-slate-500">
                                    <p className="text-lg font-medium">No income data available</p>
                                    <p className="text-sm">Start adding income to see analytics</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Investment & Loan Summary - Responsive Grid */}
            <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Investment & Loans</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {investmentData.map((item, index) => (
                        <SummaryCard key={index} {...item} />
                    ))}
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ title, amount, icon: Icon, color, light }) {
    return (
        <div className={`${light} rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 border border-slate-200 hover:border-slate-300`}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-slate-600 text-sm font-medium mb-2">{title}</p>
                    <p className="text-3xl font-bold text-slate-900">₹{(amount || 0).toFixed(2)}</p>
                </div>
                <div className={`bg-gradient-to-br ${color} p-3 rounded-lg text-white shadow-md`}>
                    <Icon size={24} />
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500">Last updated today</p>
            </div>
        </div>
    );
}
