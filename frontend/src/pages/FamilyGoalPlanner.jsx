import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Target, Plus, Sparkles, TrendingUp, Wallet, Clock, 
    AlertCircle, CheckCircle, ChevronRight, History, 
    ArrowRight, Info, ShieldAlert, LayoutDashboard
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const FamilyGoalPlanner = ({ familyId }) => {
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
        priority: 'medium'
    });

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
                priority: 'medium'
            });
        } catch (err) {
            setError(err.response?.data?.message || 'AI analysis failed. Please try again.');
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
                    <p className="text-indigo-100 max-w-md">Let Gemini AI analyze your family's financial health and create a step-by-step roadmap for your big goals.</p>
                </div>
                <button 
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-2xl hover:bg-indigo-50 transition-all font-bold shadow-lg transform hover:scale-105"
                >
                    <Plus size={20} /> Create New Plan
                </button>
            </div>

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

                            {/* AI Suggestions Content */}
                            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                                <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                                            <Sparkles size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-800">Gemini Financial Guidance</h3>
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
                                            <div className="p-6 bg-rose-50/30 border border-rose-100 rounded-3xl text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                                                {activePlan.aiSuggestion.expenseReduction}
                                            </div>
                                        </section>
                                    </div>

                                    {/* Risk Warning */}
                                    <section className="bg-amber-50/50 border border-amber-200 p-8 rounded-[2rem] space-y-4">
                                        <div className="flex items-center gap-3 text-amber-700">
                                            <ShieldAlert size={24} />
                                            <h4 className="text-lg font-bold uppercase tracking-wide">Risk Assessment & Warnings</h4>
                                        </div>
                                        <p className="text-amber-800 text-sm leading-relaxed font-medium italic">
                                            {activePlan.aiSuggestion.riskWarnings}
                                        </p>
                                    </section>

                                    {/* Timeline/Alt */}
                                    {activePlan.aiSuggestion.alternativeTimeline && (
                                        <section className="space-y-4">
                                            <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                <div className="w-1.5 h-6 bg-violet-500 rounded-full" />
                                                Investment Guidance & Alternatives
                                            </h4>
                                            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-slate-600 text-sm leading-relaxed italic">
                                                {activePlan.aiSuggestion.investmentGuidance}
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

export default FamilyGoalPlanner;
