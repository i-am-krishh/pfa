import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { 
    Target, Plus, Sparkles, TrendingUp, Wallet, Clock, 
    AlertCircle, CheckCircle, ChevronRight, History, 
    ArrowRight, Info, ShieldAlert, LayoutDashboard
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const renderBulletList = (items, bulletColorClass = 'text-indigo-500') => {
    if (!items) return null;
    let listItems = [];
    if (Array.isArray(items)) {
        listItems = items;
    } else if (typeof items === 'string') {
        listItems = items.split('\n').map(item => item.replace(/^[•\-\*\s]+/, '').trim()).filter(Boolean);
    } else {
        listItems = [String(items)];
    }

    if (listItems.length === 0) return null;

    return (
        <ul className="list-none space-y-2">
            {listItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                    <span className={`${bulletColorClass} font-black`}>•</span>
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    );
};

const renderInvestmentGuidance = (guidance) => {
    if (!guidance) return null;
    if (typeof guidance === 'string') {
        return <p className="whitespace-pre-wrap">{guidance}</p>;
    }
    if (Array.isArray(guidance)) {
        if (guidance.length > 0 && typeof guidance[0] === 'object' && guidance[0] !== null) {
            return (
                <div className="space-y-3">
                    {guidance.map((item, idx) => {
                        const title = item.assetClass || item.name || item.title || `Option ${idx + 1}`;
                        const detail = item.strategy || item.description || item.value || JSON.stringify(item);
                        return (
                            <div key={idx} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                <span className="font-extrabold text-slate-800 block mb-1 text-sm">{title}</span>
                                <span className="text-xs text-slate-500 font-medium leading-relaxed block">{detail}</span>
                            </div>
                        );
                    })}
                </div>
            );
        }
        
        return (
            <ul className="list-none space-y-2">
                {guidance.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                        <span className="text-indigo-500 font-bold">•</span>
                        <span>{String(item)}</span>
                    </li>
                ))}
            </ul>
        );
    }
    return <p>{String(guidance)}</p>;
};

const FamilyGoalPlanner = ({ familyId: propFamilyId }) => {
    const params = useParams();
    const familyId = propFamilyId || params.familyId;

    const [activeTab, setActiveTab] = useState('plans'); // 'plans' | 'calculator'
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState('');
    const [activePlan, setActivePlan] = useState(null);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        goalType: 'house',
        goalName: '',
        targetAmount: '',
        currentSavedAmount: '0',
        deadlineMonths: '',
        priority: 'medium',
        riskProfile: 'medium'
    });

    // Helper to calculate timeline progress milestones
    const getTimelineMilestones = (plan) => {
        const months = plan.deadlineMonths || 12;
        const saved = plan.currentSavedAmount || 0;
        const surplus = plan.monthlyCurrentSurplus || 0;
        const requiredSip = plan.monthlyRequiredSaving || 0;
        
        let rate = 0.09;
        if (plan.riskProfile?.toLowerCase() === 'low') rate = 0.06;
        if (plan.riskProfile?.toLowerCase() === 'high') rate = 0.12;
        const r = rate / 12;

        const calculateFV = (m, sipVal) => {
            const fvSaved = saved * Math.pow(1 + r, m);
            const fvSIP = r > 0 ? sipVal * ((Math.pow(1 + r, m) - 1) / r) * (1 + r) : sipVal * m;
            return Math.round(fvSaved + fvSIP);
        };

        const intervals = [0, Math.round(months * 0.25), Math.round(months * 0.5), Math.round(months * 0.75), months];
        const uniqueIntervals = Array.from(new Set(intervals)).sort((a, b) => a - b);

        return uniqueIntervals.map(m => ({
            month: m,
            label: m === 0 ? 'Start' : m === months ? 'Target' : `Month ${m}`,
            onlyGrowth: calculateFV(m, 0),
            currentSurplusGrowth: calculateFV(m, surplus),
            targetSIPGrowth: calculateFV(m, requiredSip)
        }));
    };

    const fetchPlans = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/family/goal-planner/${familyId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPlans(res.data.data);
            if (res.data.data.length > 0 && !activePlan) {
                setActivePlan(res.data.data[0]);
            }
        } catch (err) {
            setError('Failed to fetch goal plans');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, [familyId]);

    const handleAnalyze = async (e) => {
        e.preventDefault();
        setAnalyzing(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/family/goal-planner/analyze`, 
                { ...formData, familyId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setPlans([res.data.data, ...plans]);
            setActivePlan(res.data.data);
            setShowForm(false);
            setFormData({
                goalType: 'house',
                goalName: '',
                targetAmount: '',
                currentSavedAmount: '0',
                deadlineMonths: '',
                priority: 'medium',
                riskProfile: 'medium'
            });
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.message || 'AI analysis failed. Please try again.');
        } finally {
            setAnalyzing(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-600 to-violet-600 p-8 rounded-3xl text-white shadow-xl">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Sparkles className="text-amber-300" size={24} />
                        <h2 className="text-3xl font-bold">AI Family Goal Planner</h2>
                    </div>
                    <p className="text-indigo-100 max-w-md">Let AI analyze your family's financial health and create a step-by-step roadmap for your big goals.</p>
                </div>
                <button 
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-2xl hover:bg-indigo-50 transition-all font-bold shadow-lg transform hover:scale-105"
                >
                    <Plus size={20} /> Create New Plan
                </button>
            </div>

            {/* Tab Selector */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 w-max shadow-sm">
                <button
                    onClick={() => setActiveTab('plans')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        activeTab === 'plans'
                            ? 'bg-white text-indigo-700 shadow-md'
                            : 'text-slate-600 hover:text-slate-800'
                    }`}
                >
                    <Target size={16} /> Strategic Plans Roadmap
                </button>
                <button
                    onClick={() => setActiveTab('calculator')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        activeTab === 'calculator'
                            ? 'bg-white text-indigo-700 shadow-md'
                            : 'text-slate-600 hover:text-slate-800'
                    }`}
                >
                    <TrendingUp size={16} /> Interactive SIP & Goal Calculator
                </button>
            </div>

            {activeTab === 'calculator' ? (
                <GoalCalculator />
            ) : (
                <>
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl flex items-center gap-3 animate-in fade-in duration-300">
                            <AlertCircle size={20} />
                            <p className="font-medium">{error}</p>
                        </div>
                    )}

            {/* Analysis Form Modal/Section */}
            {showForm && (
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold text-slate-800">Plan a New Goal</h3>
                        <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">×</button>
                    </div>
                    <form onSubmit={handleAnalyze} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Goal Type</label>
                            <select 
                                value={formData.goalType} 
                                onChange={(e) => setFormData({...formData, goalType: e.target.value})}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                            >
                                <option value="house">🏠 Buying a House</option>
                                <option value="car">🚗 Buying a Car</option>
                                <option value="education">🎓 Child Education</option>
                                <option value="emergency_fund">🛡️ Emergency Fund</option>
                                <option value="travel">✈️ Travel/Vacation</option>
                                <option value="retirement">🌅 Retirement Plan</option>
                                <option value="wedding">💍 Wedding</option>
                                <option value="business">💼 Starting a Business</option>
                                <option value="other">🎯 Other Goal</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Goal Name</label>
                            <input 
                                type="text" required placeholder="e.g. Dream House 2026"
                                value={formData.goalName} 
                                onChange={(e) => setFormData({...formData, goalName: e.target.value})}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Target Amount (₹)</label>
                            <input 
                                type="number" required min="1"
                                value={formData.targetAmount} 
                                onChange={(e) => setFormData({...formData, targetAmount: e.target.value})}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-indigo-600"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Already Saved (₹)</label>
                            <input 
                                type="number" min="0"
                                value={formData.currentSavedAmount} 
                                onChange={(e) => setFormData({...formData, currentSavedAmount: e.target.value})}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-emerald-600"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Deadline (Months)</label>
                            <input 
                                type="number" required min="1"
                                value={formData.deadlineMonths} 
                                onChange={(e) => setFormData({...formData, deadlineMonths: e.target.value})}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Priority</label>
                            <select 
                                value={formData.priority} 
                                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Risk Profile</label>
                            <select 
                                value={formData.riskProfile} 
                                onChange={(e) => setFormData({...formData, riskProfile: e.target.value})}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                            >
                                <option value="low">Conservative (Low Risk - ~6% return)</option>
                                <option value="medium">Moderate (Medium Risk - ~9% return)</option>
                                <option value="high">Aggressive (High Risk - ~12% return)</option>
                            </select>
                        </div>
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end gap-4 mt-4">
                            <button 
                                type="button" onClick={() => setShowForm(false)}
                                className="px-8 py-4 text-slate-600 font-bold hover:bg-slate-50 rounded-2xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" disabled={analyzing}
                                className={`flex items-center gap-3 px-10 py-4 bg-indigo-600 text-white font-bold rounded-2xl transition-all shadow-xl shadow-indigo-200 ${analyzing ? 'opacity-70 cursor-not-allowed' : 'hover:bg-indigo-700 transform hover:-translate-y-1'}`}
                            >
                                {analyzing ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        AI is Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={20} className="text-amber-300" />
                                        Analyze Goal
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Plans History Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-6 text-slate-800">
                            <History size={20} className="text-indigo-600" />
                            <h3 className="text-xl font-bold">Plan History</h3>
                        </div>
                        
                        {plans.length === 0 ? (
                            <div className="text-center py-10">
                                <Target className="mx-auto text-slate-200 mb-4" size={48} />
                                <p className="text-slate-400 font-medium italic">No strategic plans created yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {plans.map(plan => (
                                    <button 
                                        key={plan._id}
                                        onClick={() => setActivePlan(plan)}
                                        className={`w-full text-left p-4 rounded-2xl transition-all border ${activePlan?._id === plan._id ? 'bg-indigo-50 border-indigo-200 shadow-md translate-x-2' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-slate-800 truncate">{plan.goalName}</h4>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${plan.status === 'achievable' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {plan.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-500 font-medium">
                                            <span>₹{plan.targetAmount.toLocaleString()}</span>
                                            <span>{plan.deadlineMonths} months</span>
                                        </div>
                                        <div className="mt-2 w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500" style={{ width: `${plan.feasibilityScore}%` }} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-indigo-900 p-6 rounded-3xl text-white shadow-xl">
                        <div className="flex items-center gap-2 mb-3">
                            <ShieldAlert className="text-amber-400" size={18} />
                            <h4 className="font-bold text-sm">Financial Disclaimer</h4>
                        </div>
                        <p className="text-xs text-indigo-200 leading-relaxed italic">
                            "This is an AI-generated financial planning suggestion and not professional financial advice. All investments carry risks. Please consult with a certified financial planner before making major decisions."
                        </p>
                    </div>
                </div>

                {/* Active Plan Detail View */}
                <div className="lg:col-span-8 space-y-8">
                    {activePlan ? (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                            {/* Plan Header */}
                            <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl">
                                            {activePlan.goalType === 'house' ? '🏠' : 
                                             activePlan.goalType === 'car' ? '🚗' : 
                                             activePlan.goalType === 'education' ? '🎓' : 
                                             activePlan.goalType === 'emergency_fund' ? '🛡️' : 
                                             activePlan.goalType === 'travel' ? '✈️' : 
                                             activePlan.goalType === 'retirement' ? '🌅' : 
                                             activePlan.goalType === 'wedding' ? '💍' : 
                                             activePlan.goalType === 'business' ? '💼' : '🎯'}
                                        </span>
                                        <div>
                                            <h3 className="text-2xl font-extrabold text-slate-800">{activePlan.goalName}</h3>
                                            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">{activePlan.goalType.replace('_', ' ')} Goal</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold uppercase">
                                        Priority: {activePlan.priority}
                                    </span>
                                    <span className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold uppercase">
                                        Risk: {activePlan.riskProfile || 'medium'}
                                    </span>
                                    <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold uppercase">
                                        Target: ₹{activePlan.targetAmount.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Dashboard Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
                                <MetricCard 
                                    title="Feasibility Score" 
                                    value={`${activePlan.feasibilityScore}/100`} 
                                    icon={<LayoutDashboard className="text-indigo-500" />}
                                    color={activePlan.feasibilityScore >= 70 ? 'text-emerald-600' : activePlan.feasibilityScore >= 40 ? 'text-amber-500' : 'text-rose-500'}
                                />
                                <MetricCard 
                                    title="Req. Monthly Saving" 
                                    value={`₹${activePlan.monthlyRequiredSaving.toLocaleString()}`} 
                                    icon={<TrendingUp className="text-emerald-500" />}
                                    subtitle={`Current Surplus: ₹${activePlan.monthlyCurrentSurplus.toLocaleString()}`}
                                />
                                <MetricCard 
                                    title="Monthly Shortfall" 
                                    value={`₹${activePlan.monthlyShortfall.toLocaleString()}`} 
                                    icon={<AlertCircle className="text-rose-500" />}
                                    color={activePlan.monthlyShortfall > 0 ? 'text-rose-600' : 'text-emerald-600'}
                                />
                                <MetricCard 
                                    title="Savings Rate" 
                                    value={`${activePlan.savingsRate.toFixed(1)}%`} 
                                    icon={<Wallet className="text-blue-500" />}
                                    subtitle="of family income"
                                />
                                <MetricCard 
                                    title="EMI-to-Income" 
                                    value={`${activePlan.emiToIncomeRatio.toFixed(1)}%`} 
                                    icon={<ShieldAlert className="text-amber-500" />}
                                    subtitle={activePlan.emiToIncomeRatio > 40 ? 'High Debt Risk' : 'Healthy Ratio'}
                                />
                                <MetricCard 
                                    title="Goal Status" 
                                    value={activePlan.status.replace('_', ' ').toUpperCase()} 
                                    icon={<CheckCircle className="text-teal-500" />}
                                    color={activePlan.status === 'achievable' ? 'text-emerald-600' : 'text-amber-500'}
                                />
                            </div>

                            {/* Goal Progress & Expected Corpus Tracker */}
                            {(() => {
                                const baseTarget = activePlan.targetAmount || 1;
                                const inflationTarget = activePlan.futureTargetAmount || baseTarget;
                                const currentSaved = activePlan.currentSavedAmount || 0;
                                const projectedVal = activePlan.projectedFutureValue || 0;

                                const currentProgressPercent = Math.min(100, Math.round((currentSaved / inflationTarget) * 100));
                                const projectedProgressPercent = Math.min(100, Math.round((projectedVal / inflationTarget) * 100));

                                return (
                                    <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm mb-6 space-y-6">
                                        <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                                            Goal Progress & Expected Corpus
                                        </h4>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* Left side: Progress details */}
                                            <div className="space-y-4">
                                                <div>
                                                    <div className="flex justify-between items-center text-sm font-semibold text-slate-500 mb-2">
                                                        <span>Current Savings Progress</span>
                                                        <span className="text-indigo-600 font-bold">{currentProgressPercent}% Achieved</span>
                                                    </div>
                                                    <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex relative shadow-inner">
                                                        <div 
                                                            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500" 
                                                            style={{ width: `${currentProgressPercent}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="flex justify-between items-center text-sm font-semibold text-slate-500 mb-2">
                                                        <span>Projected Progress (With Surplus Savings)</span>
                                                        <span className="text-emerald-600 font-bold">{projectedProgressPercent}% Projected</span>
                                                    </div>
                                                    <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex relative shadow-inner">
                                                        <div 
                                                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500" 
                                                            style={{ width: `${projectedProgressPercent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                
                                                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-xs text-indigo-800 leading-relaxed">
                                                    💡 <strong>Progress Insights:</strong> You have accumulated <strong>₹{currentSaved.toLocaleString()}</strong> towards the inflation-adjusted goal of <strong>₹{inflationTarget.toLocaleString()}</strong>.
                                                    If you continue, your current monthly surplus is projected to grow your total corpus to <strong>₹{projectedVal.toLocaleString()}</strong> by the end of the {activePlan.deadlineMonths}-month period.
                                                </div>
                                            </div>

                                            {/* Right side: Expected Corpus Breakdown with Inflation */}
                                            <div className="space-y-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                                <h5 className="font-extrabold text-slate-700 text-sm uppercase tracking-wider mb-2">Expected Corpus Breakdown</h5>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-slate-500 font-medium">Base Target (Today's Value)</span>
                                                        <span className="font-bold text-slate-800">₹{baseTarget.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-slate-500 font-medium">Inflation Rate (Annualized)</span>
                                                        <span className="font-bold text-amber-600">6.0%</span>
                                                    </div>
                                                    <div className="h-px bg-slate-200 my-2" />
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-slate-700 font-bold">Inflation-Adjusted Target</span>
                                                        <span className="font-black text-indigo-600 text-lg">₹{inflationTarget.toLocaleString()}</span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 italic mt-1 leading-normal">
                                                        * Due to inflation, a cost of ₹{baseTarget.toLocaleString()} today will require ₹{inflationTarget.toLocaleString()} in {activePlan.deadlineMonths} months to maintain the same purchasing power.
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Asset Allocation & Strategy */}
                            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm mb-6 space-y-6">
                                <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                                    Suggested Asset Allocation
                                </h4>

                                <div className="space-y-6">
                                    {/* Visual Segmentation Bar */}
                                    {(() => {
                                        const risk = activePlan.riskProfile?.toLowerCase() || 'medium';
                                        let segments = [];
                                        if (risk === 'low') {
                                            segments = [
                                                { label: 'Equity / Index Funds', value: 25, color: 'bg-indigo-600' },
                                                { label: 'Debt / Bond Funds', value: 65, color: 'bg-emerald-500' },
                                                { label: 'Gold / Commodities', value: 10, color: 'bg-amber-400' }
                                            ];
                                        } else if (risk === 'high') {
                                            segments = [
                                                { label: 'Large Cap Index', value: 40, color: 'bg-indigo-600' },
                                                { label: 'Mid & Small Cap', value: 35, color: 'bg-violet-500' },
                                                { label: 'Alt Assets (Crypto/Sec)', value: 15, color: 'bg-rose-500' },
                                                { label: 'Debt / Bond Funds', value: 10, color: 'bg-emerald-500' }
                                            ];
                                        } else {
                                            segments = [
                                                { label: 'Equity Mutual Funds', value: 55, color: 'bg-indigo-600' },
                                                { label: 'Debt Mutual Funds', value: 30, color: 'bg-emerald-500' },
                                                { label: 'Gold ETFs', value: 10, color: 'bg-amber-400' },
                                                { label: 'Cash Equivalents', value: 5, color: 'bg-blue-400' }
                                            ];
                                        }

                                        return (
                                            <div className="space-y-4">
                                                {/* Stacked Progress Bar */}
                                                <div className="w-full h-8 bg-slate-100 rounded-2xl overflow-hidden flex shadow-inner">
                                                    {segments.map((seg, idx) => (
                                                        <div 
                                                            key={idx}
                                                            className={`${seg.color} h-full transition-all flex items-center justify-center text-[10px] text-white font-black`}
                                                            style={{ width: `${seg.value}%` }}
                                                            title={`${seg.label}: ${seg.value}%`}
                                                        >
                                                            {seg.value >= 10 ? `${seg.value}%` : ''}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Legend */}
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                                                    {segments.map((seg, idx) => (
                                                        <div key={idx} className="flex items-center gap-2">
                                                            <div className={`w-3.5 h-3.5 rounded-md ${seg.color}`} />
                                                            <div>
                                                                <p className="text-xs font-bold text-slate-700">{seg.label}</p>
                                                                <p className="text-[10px] font-semibold text-slate-400">{seg.value}% Allocation</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <div className="p-5 bg-emerald-50/30 border border-emerald-100 rounded-2xl text-sm text-slate-700 leading-relaxed">
                                        <strong>Allocation Strategy:</strong> {activePlan.suggestedStrategy}
                                    </div>
                                </div>
                            </div>

                            {/* Projected Growth Timeline */}
                            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm mb-6 space-y-6">
                                <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                                    Projected Growth Timeline
                                </h4>

                                <div className="overflow-x-auto pb-4 scrollbar-thin">
                                    <div className="min-w-[640px] flex justify-between items-start relative px-4 pt-4">
                                        {/* Connector Line */}
                                        <div className="absolute left-[8%] right-[8%] top-[34px] h-[3px] bg-slate-100 z-0" />
                                        
                                        {getTimelineMilestones(activePlan).map((milestone, idx) => (
                                            <div key={idx} className="flex flex-col items-center text-center relative z-10 w-[18%]">
                                                {/* Milestone Circle */}
                                                <div className="w-10 h-10 bg-white border-[3px] border-indigo-600 rounded-full flex items-center justify-center text-indigo-600 font-extrabold shadow-md mb-3">
                                                    {idx === 0 ? 'S' : idx === 4 ? '🏁' : `${Math.round(idx * 25)}%`}
                                                </div>

                                                <p className="text-xs font-bold text-slate-800">{milestone.label}</p>
                                                
                                                <div className="mt-3 space-y-1.5 bg-slate-50 border border-slate-100 p-3 rounded-2xl w-full text-[10px]">
                                                    <div>
                                                        <span className="block text-slate-400 font-semibold">No SIP Growth</span>
                                                        <span className="font-extrabold text-slate-600 text-[11px]">₹{milestone.onlyGrowth.toLocaleString()}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-slate-400 font-semibold">With Surplus</span>
                                                        <span className="font-extrabold text-amber-600 text-[11px]">₹{milestone.currentSurplusGrowth.toLocaleString()}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-slate-400 font-semibold">With Target SIP</span>
                                                        <span className="font-extrabold text-emerald-600 text-[11px]">₹{milestone.targetSIPGrowth.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="text-[10px] text-slate-400 italic text-center mt-2">
                                    * Projections assume compounded monthly returns based on your selected risk profile return rates.
                                </div>
                            </div>

                            {/* AI Suggestions Content */}
                            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                                <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                                            <Sparkles size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-800">AI Financial Guidance</h3>
                                            <p className="text-sm text-slate-500 font-medium">Personalized roadmap for {activePlan.goalName}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-2">
                                        <Info size={14} /> AI Analysis
                                    </span>
                                </div>

                                <div className="p-8 space-y-10">
                                    {/* Summary */}
                                    <section>
                                        <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-3">
                                            <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                                            Executive Summary
                                        </h4>
                                        <div className="bg-indigo-50/50 p-6 rounded-3xl text-slate-700 leading-relaxed">
                                            {activePlan.aiSuggestion.summary}
                                        </div>
                                    </section>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Strategy */}
                                        <section className="space-y-4">
                                            <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                                                Monthly Savings Plan
                                            </h4>
                                            <div className="p-6 bg-emerald-50/30 border border-emerald-100 rounded-3xl text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                                                {activePlan.aiSuggestion.monthlyPlan}
                                            </div>
                                        </section>

                                        {/* Expense Cuts */}
                                        <section className="space-y-4">
                                            <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                <div className="w-1.5 h-6 bg-rose-500 rounded-full" />
                                                Cost Reduction Tips
                                            </h4>
                                            <div className="p-6 bg-rose-50/30 border border-rose-100 rounded-3xl text-slate-700 text-sm leading-relaxed">
                                                {renderBulletList(activePlan.aiSuggestion.expenseReduction, 'text-rose-500')}
                                            </div>
                                        </section>
                                    </div>

                                    {/* Risk Warning */}
                                    <section className="bg-amber-50/50 border border-amber-200 p-8 rounded-[2rem] space-y-4">
                                        <div className="flex items-center gap-3 text-amber-700">
                                            <ShieldAlert size={24} />
                                            <h4 className="text-lg font-bold uppercase tracking-wide">Risk Assessment & Warnings</h4>
                                        </div>
                                        <div className="text-amber-800 text-sm leading-relaxed font-medium italic">
                                            {renderBulletList(activePlan.aiSuggestion.riskWarnings, 'text-amber-600')}
                                        </div>
                                    </section>

                                    {/* Timeline/Alt */}
                                    {activePlan.aiSuggestion.alternativeTimeline && (
                                        <section className="space-y-4">
                                            <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                <div className="w-1.5 h-6 bg-violet-500 rounded-full" />
                                                Investment Guidance & Alternatives
                                            </h4>
                                            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-slate-600 text-sm leading-relaxed italic">
                                                {renderInvestmentGuidance(activePlan.aiSuggestion.investmentGuidance)}
                                                <div className="mt-4 pt-4 border-t border-slate-200 font-bold text-indigo-700">
                                                    Timeline Suggestion: {activePlan.aiSuggestion.alternativeTimeline}
                                                </div>
                                            </div>
                                        </section>
                                    )}

                                    {/* Roadmap Steps */}
                                    <section>
                                        <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                                            <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                                            Goal Achievement Roadmap
                                        </h4>
                                        <div className="relative space-y-8 before:absolute before:left-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-indigo-100">
                                            {activePlan.roadmap.map((step, i) => (
                                                <div key={i} className="relative flex gap-6 items-start pl-12 group">
                                                    <div className="absolute left-0 w-12 h-12 bg-white border-2 border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-bold group-hover:border-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm z-10">
                                                        {step.step}
                                                    </div>
                                                    <div className="flex-1 pt-1">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <h5 className="font-bold text-slate-800">{step.title}</h5>
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase bg-slate-50 px-2 py-1 rounded-md">
                                                                {new Date(step.targetDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-slate-500 leading-relaxed">{step.description}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[500px] bg-white rounded-[3rem] border border-slate-100 border-dashed text-slate-300">
                            <Target size={80} strokeWidth={1} />
                            <h3 className="text-xl font-bold mt-6 text-slate-400">Select a plan to view analysis</h3>
                            <p className="text-sm mt-2 text-slate-300">Or create a new strategic roadmap above</p>
                        </div>
                    )}
                </div>
            </div>
            </>
            )}
        </div>
    );
};

const MetricCard = ({ title, value, icon, subtitle, color = 'text-slate-800' }) => (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
        <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                {icon}
            </div>
            {subtitle && (
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-lg font-bold truncate max-w-[100px]">
                    {subtitle}
                </span>
            )}
        </div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
        <p className={`text-2xl font-black mt-1 ${color}`}>{value}</p>
    </div>
);

const GoalCalculator = () => {
  const [target, setTarget] = useState(2500000);
  const [months, setMonths] = useState(60);
  const [saved, setSaved] = useState(200000);
  const [inflation, setInflation] = useState(6);
  const [risk, setRisk] = useState('medium');
  const [capacity, setCapacity] = useState(30000);

  // Calculations
  const years = months / 12;
  const infRate = inflation / 100;
  const futureTarget = Math.round(target * Math.pow(1 + infRate, years));
  
  let expectedReturn = 0.09;
  if (risk === 'low') expectedReturn = 0.06;
  if (risk === 'high') expectedReturn = 0.12;
  
  const monthlyRate = expectedReturn / 12;
  const fvSaved = Math.round(saved * Math.pow(1 + monthlyRate, months));
  const remainingTarget = Math.max(0, futureTarget - fvSaved);
  
  const sipFactor = monthlyRate > 0 
    ? ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate)
    : months;
    
  const requiredSip = remainingTarget > 0 ? Math.round(remainingTarget / sipFactor) : 0;
  
  // Projected value if investing current capacity
  const fvAnnuity = monthlyRate > 0 
    ? capacity * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate)
    : capacity * months;
  const projectedFV = fvSaved + fvAnnuity;
  
  const achievementScore = requiredSip > 0 
    ? Math.min(100, Math.round((capacity / requiredSip) * 100))
    : 100;

  // Chart data generation (split in 6 intervals)
  const chartData = [];
  const intervals = 6;
  for (let i = 0; i <= intervals; i++) {
    const m = Math.round((months / intervals) * i);
    const y = m / 12;
    
    // Pro-rata Target Path (curved target line adjusting for inflation)
    const currentTargetInflation = Math.round(target * Math.pow(1 + infRate, y));
    const targetPath = Math.round((currentTargetInflation / months) * m);
    
    // savings compounding only
    const curSavedComp = Math.round(saved * Math.pow(1 + monthlyRate, m));
    
    // with required SIP
    const sipGrowthFactor = monthlyRate > 0 
      ? ((Math.pow(1 + monthlyRate, m) - 1) / monthlyRate) * (1 + monthlyRate)
      : m;
    const requiredSipGrowth = Math.round(curSavedComp + requiredSip * sipGrowthFactor);
    
    // with capacity
    const capacitySipGrowth = Math.round(curSavedComp + capacity * sipGrowthFactor);

    chartData.push({
      label: m === 0 ? 'Start' : m === months ? 'Target' : `M ${m}`,
      'Target Path': targetPath,
      'Compounded Savings Only': curSavedComp,
      'With Required SIP': requiredSipGrowth,
      'With Your Capacity': capacitySipGrowth
    });
  }

  // Formatting INR
  const formatCurrency = (val) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 0
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
      {/* Left panel: sliders */}
      <div className="lg:col-span-5 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 border-b pb-4">
          <Sparkles className="text-indigo-600 animate-pulse" size={20} />
          Goal Planner Simulator
        </h3>

        {/* Target Amount */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-xs font-bold text-slate-500 uppercase">Target Amount (Current Value)</label>
            <span className="text-sm font-black text-indigo-600">{formatCurrency(target)}</span>
          </div>
          <input 
            type="range" min="100000" max="10000000" step="50000"
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-bold">
            <span>₹1 L</span>
            <span>₹50 L</span>
            <span>₹1 Cr</span>
          </div>
        </div>

        {/* Time period */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-xs font-bold text-slate-500 uppercase">Time Horizon (Months)</label>
            <span className="text-sm font-black text-slate-800">{months} Months ({(months / 12).toFixed(1)} Years)</span>
          </div>
          <input 
            type="range" min="12" max="240" step="6"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-bold">
            <span>1 Year</span>
            <span>10 Years</span>
            <span>20 Years</span>
          </div>
        </div>

        {/* Already saved */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-xs font-bold text-slate-500 uppercase">Already Saved / Lumpsum</label>
            <span className="text-sm font-black text-emerald-600">{formatCurrency(saved)}</span>
          </div>
          <input 
            type="range" min="0" max="5000000" step="10000"
            value={saved}
            onChange={(e) => setSaved(Number(e.target.value))}
            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-bold">
            <span>₹0</span>
            <span>₹25 L</span>
            <span>₹50 L</span>
          </div>
        </div>

        {/* Savings capacity */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-xs font-bold text-slate-500 uppercase">Your Monthly Savings Capacity</label>
            <span className="text-sm font-black text-indigo-700">{formatCurrency(capacity)}</span>
          </div>
          <input 
            type="range" min="1000" max="200000" step="1000"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-bold">
            <span>₹1,000</span>
            <span>₹1 L</span>
            <span>₹2 L</span>
          </div>
        </div>

        {/* Inflation & Risk Profile */}
        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase block">Expected Inflation</label>
            <select
              value={inflation}
              onChange={(e) => setInflation(Number(e.target.value))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-sm text-slate-800"
            >
              <option value="4">4.0% Low</option>
              <option value="6">6.0% Avg (Ind)</option>
              <option value="8">8.0% High</option>
              <option value="10">10.0% Extreme</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase block">Investment Risk</label>
            <select
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-sm text-slate-800"
            >
              <option value="low">Conservative (~6%)</option>
              <option value="medium">Balanced (~9%)</option>
              <option value="high">Aggressive (~12%)</option>
            </select>
          </div>
        </div>

      </div>

      {/* Right panel: results & charts */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Metric boxes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expected Corpus</span>
            <span className="text-xl font-black text-slate-950 mt-1 block">{formatCurrency(futureTarget)}</span>
            <span className="text-[10px] text-amber-600 font-extrabold mt-1 block">Incl. Inflation margin</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly Req.</span>
            <span className="text-xl font-black text-indigo-600 mt-1 block">{formatCurrency(requiredSip)}</span>
            <span className="text-[10px] text-slate-400 font-semibold mt-1 block">SIP for target goal</span>
          </div>

          <div className={`p-5 rounded-2xl border shadow-sm transition-all duration-300 ${
            achievementScore >= 80 
              ? 'bg-emerald-50/50 border-emerald-100 text-emerald-950'
              : achievementScore >= 50
                ? 'bg-amber-50/50 border-amber-100 text-amber-950'
                : 'bg-rose-50/50 border-rose-100 text-rose-950'
          }`}>
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Achievement Score</span>
            <span className="text-xl font-black mt-1 block">{achievementScore}%</span>
            <span className="text-[10px] font-bold mt-1 block">
              {achievementScore >= 80 ? 'Highly Achievable' : achievementScore >= 50 ? 'Feasible with effort' : 'Requires adjustment'}
            </span>
          </div>
        </div>

        {/* Growth timeline chart */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
            <div className="w-1.5 h-4 bg-indigo-600 rounded-full" />
            Compounded Value Projections Timeline
          </h4>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorRequired" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} />
                <YAxis 
                  stroke="#94a3b8" fontSize={10}
                  tickFormatter={(val) => `₹${(val / 100000).toFixed(1)} L`} 
                />
                <Tooltip formatter={(val) => [formatCurrency(val), '']} />
                <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="Target Path" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorTarget)" />
                <Area type="monotone" dataKey="With Required SIP" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRequired)" />
                <Area type="monotone" dataKey="With Your Capacity" stroke="#ec4899" strokeWidth={1.5} strokeDasharray="4 4" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Investment Strategy Advice */}
        <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-xs text-indigo-900 leading-relaxed">
          <strong>Suggested Investment Allocation Strategy:</strong>
          <ul className="list-disc pl-5 mt-2 space-y-1 font-semibold text-slate-700">
            {risk === 'low' && (
              <>
                <li>Route <strong>65%</strong> of funds to AAA-rated corporate debt securities & liquid bank deposits.</li>
                <li>Deploy <strong>25%</strong> systematically into Large Cap Index / Equity mutual funds.</li>
                <li>Store <strong>10%</strong> in Gold Sovereign Bonds / Gold ETFs for stability.</li>
              </>
            )}
            {risk === 'medium' && (
              <>
                <li>Allocate <strong>55%</strong> to Multi-Cap diversified equity mutual funds.</li>
                <li>Store <strong>30%</strong> in high-yield dynamic bond & credit risk debt funds.</li>
                <li>Diversify <strong>10%</strong> into Gold ETFs and <strong>5%</strong> in cash equivalent deposits.</li>
              </>
            )}
            {risk === 'high' && (
              <>
                <li>Deploy <strong>40%</strong> into Large Cap Index tracking ETFs.</li>
                <li>Channel <strong>35%</strong> into Mid & Small Cap high-growth mutual funds.</li>
                <li>Allocate <strong>15%</strong> to Alternative Assets (e.g., Cryptocurrencies / Sector ETFs).</li>
                <li>Maintain <strong>10%</strong> in Short-Term Corporate Debt Bonds.</li>
              </>
            )}
          </ul>
        </div>

      </div>
    </div>
  );
};

export default FamilyGoalPlanner;
