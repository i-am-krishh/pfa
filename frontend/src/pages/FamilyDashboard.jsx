import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import { 
    TrendingUp, TrendingDown, Users, Wallet, Target, 
    AlertTriangle, Activity, CheckCircle
} from 'lucide-react';

const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#10b981'];

const FamilyDashboard = ({ familyId }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/family/dashboard/${familyId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setData(res.data.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to fetch dashboard data');
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, [familyId]);

    if (loading) return (
        <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (error) return <div className="text-red-500 bg-red-50 p-4 rounded-xl">{error}</div>;
    if (!data) return null;

    // Format data for charts
    const pieData = data.categoryWiseExpenses.map(item => ({
        name: item._id || 'Uncategorized',
        value: item.total
    }));

    // Member chart data
    const memberChartData = data.members.map(member => {
        // Extract the user ID whether it's populated or not
        const userId = member.user._id || member.user;
        const contribution = data.memberContribution.find(c => (c._id?.toString() === userId?.toString()))?.total || 0;
        const spending = data.memberSpending.find(s => (s._id?.toString() === userId?.toString()))?.total || 0;
        return {
            name: member.user.fullName || 'Unknown Member',
            Income: contribution,
            Expense: spending
        };
    });

    return (
        <div className="space-y-6">
            {data.pendingCount > 0 && (data.myRole === 'Admin' || data.myRole === 'Co-Admin') && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="text-amber-500" size={24} />
                        <div>
                            <h3 className="font-bold text-amber-900">Pending Approvals</h3>
                            <p className="text-amber-700 text-sm">You have {data.pendingCount} transaction{data.pendingCount !== 1 && 's'} waiting for approval.</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-bold text-slate-800">Family Overview</h2>
                <span className="text-sm bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-semibold">
                    {data.members.length} Members
                </span>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(data.myRole === 'Admin' || data.myRole === 'Co-Admin' || data.myMemberData?.canViewIncome !== false) && (
                    <>
                        <KpiCard 
                            icon={<Wallet className="text-emerald-500" />} 
                            title="Total Income" 
                            value={`₹${data.totalIncome.toLocaleString()}`} 
                            bg="bg-emerald-50"
                            subtitle={`₹${data.directIncome.toLocaleString()} Direct • ₹${data.sharedIncome.toLocaleString()} Shared`}
                        />
                        <KpiCard 
                            icon={<TrendingUp className="text-indigo-500" />} 
                            title="Family Savings" 
                            value={`₹${data.totalSavings.toLocaleString()}`} 
                            bg="bg-indigo-50" 
                        />
                    </>
                )}
                <KpiCard 
                    icon={<TrendingDown className="text-rose-500" />} 
                    title="Total Expenses" 
                    value={`₹${data.totalExpenses.toLocaleString()}`} 
                    bg="bg-rose-50" 
                    subtitle={`₹${data.directExpenses.toLocaleString()} Direct • ₹${data.sharedExpenses.toLocaleString()} Shared`}
                />
                <KpiCard icon={<Activity className="text-amber-500" />} title="Monthly Spending" value={`₹${data.monthlyExpenses.toLocaleString()}`} bg="bg-amber-50" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Charts Area */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Member Chart */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Member Contributions & Spending</h3>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={memberChartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} tickFormatter={(v) => `$${v}`} />
                                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                    <Legend iconType="circle" />
                                    <Bar dataKey="Income" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                    <Bar dataKey="Expense" fill="#fb7185" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Category Pie */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Expenses by Category</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Budgets List */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Budget Alerts</h3>
                            {data.activeBudgets.length === 0 ? (
                                <p className="text-slate-500 text-sm">No active budgets set.</p>
                            ) : (
                                <div className="space-y-4">
                                    {data.activeBudgets.map(budget => (
                                        <div key={budget._id}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="font-semibold text-slate-700">{budget.category}</span>
                                                <span className="text-slate-500">${budget.usedAmount} / ${budget.limit}</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full ${budget.usagePercent >= 90 ? 'bg-red-500' : budget.usagePercent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                    style={{ width: `${Math.min(budget.usagePercent, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Lists */}
                <div className="space-y-6">
                    {/* Active Goals */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <Target className="text-indigo-500" size={20} />
                            <h3 className="text-lg font-bold text-slate-800">Active Goals</h3>
                        </div>
                        {data.activeGoals.length === 0 ? (
                            <p className="text-slate-500 text-sm">No active goals.</p>
                        ) : (
                            <div className="space-y-4">
                                {data.activeGoals.map(goal => {
                                    const percent = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
                                    return (
                                        <div key={goal._id} className="p-3 bg-slate-50 rounded-xl">
                                            <div className="flex justify-between font-semibold text-sm text-slate-700 mb-1">
                                                <span>{goal.goalName}</span>
                                                <span>{percent.toFixed(0)}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden mb-2">
                                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(percent, 100)}%` }} />
                                            </div>
                                            <p className="text-xs text-slate-500 text-right">${goal.currentAmount} / ${goal.targetAmount}</p>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Recent Transactions */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Recent Shared Activity</h3>
                        {data.recentTransactions.length === 0 ? (
                            <p className="text-slate-500 text-sm">No recent transactions.</p>
                        ) : (
                            <div className="space-y-3">
                                {data.recentTransactions.slice(0, 5).map((t, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                {t.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm text-slate-800">{t.category}</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs text-slate-500">{t.userName}</p>
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter ${t.dataSource === 'family_direct' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                                                        {t.dataSource === 'family_direct' ? 'Direct' : 'Shared'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`font-bold text-sm ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {t.type === 'income' ? '+' : '-'}${t.amount}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const KpiCard = ({ icon, title, value, bg, subtitle }) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all group">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${bg}`}>
            {icon}
        </div>
        <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-500 truncate">{title}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1 truncate">{value}</p>
            {subtitle && <p className="text-[10px] text-slate-400 mt-1 font-medium">{subtitle}</p>}
        </div>
    </div>
);

export default FamilyDashboard;
