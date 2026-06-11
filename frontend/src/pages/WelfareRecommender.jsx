import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Sparkles, ShieldAlert, Clock, FileText, CheckCircle2, 
    Info, Home, HeartPulse, GraduationCap, Coins, Briefcase, 
    Check, ArrowRight, ExternalLink, Bookmark, UserCheck, RefreshCw, AlertCircle
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const categoryIcons = {
    'Housing': <Home className="text-blue-500" size={18} />,
    'Healthcare': <HeartPulse className="text-rose-500" size={18} />,
    'Education': <GraduationCap className="text-emerald-500" size={18} />,
    'Scholarships': <GraduationCap className="text-emerald-500" size={18} />,
    'Women Welfare': <Sparkles className="text-purple-500" size={18} />,
    'Farmers': <Coins className="text-amber-500" size={18} />,
    'Employment': <Briefcase className="text-teal-500" size={18} />,
    'Business Loans': <Briefcase className="text-indigo-500" size={18} />,
    'Pension': <Clock className="text-violet-500" size={18} />,
    'Insurance': <ShieldAlert className="text-cyan-500" size={18} />,
    'Financial Assistance': <Coins className="text-amber-500" size={18} />
};

export default function WelfareRecommender({ familyId }) {
    const [activeSubTab, setActiveSubTab] = useState('dashboard'); // 'dashboard' | 'form' | 'applied'
    const [profile, setProfile] = useState(null);
    const [allSchemes, setAllSchemes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');

    // Profile form state
    const [formData, setFormData] = useState({
        annualFamilyIncome: 350000,
        familySize: 4,
        state: 'Uttar Pradesh',
        memberAgesText: '35, 34, 10, 8',
        gender: 'mixed',
        occupation: 'salaried',
        isStudent: true,
        isFarmer: false,
        isDisabled: false,
        isSeniorCitizen: false,
        ownsHome: true
    });

    const fetchProfile = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/welfare/profile/${familyId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.data) {
                setProfile(res.data.data);
                // Pre-populate form
                setFormData({
                    annualFamilyIncome: res.data.data.annualFamilyIncome,
                    familySize: res.data.data.familySize,
                    state: res.data.data.state,
                    memberAgesText: res.data.data.memberAges?.join(', ') || '',
                    gender: res.data.data.gender || 'mixed',
                    occupation: res.data.data.occupation || 'salaried',
                    isStudent: res.data.data.isStudent || false,
                    isFarmer: res.data.data.isFarmer || false,
                    isDisabled: res.data.data.isDisabled || false,
                    isSeniorCitizen: res.data.data.isSeniorCitizen || false,
                    ownsHome: res.data.data.ownsHome !== undefined ? res.data.data.ownsHome : true
                });
            } else if (res.data.allSchemes) {
                setAllSchemes(res.data.allSchemes);
            }
        } catch (err) {
            console.error("Fetch welfare error:", err);
            setError('Failed to fetch welfare recommendations profile.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (familyId) {
            fetchProfile();
        }
    }, [familyId]);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccessMessage('');

        const ages = formData.memberAgesText
            .split(',')
            .map(age => age.trim())
            .filter(Boolean)
            .map(Number)
            .filter(age => !isNaN(age));

        const postBody = {
            ...formData,
            memberAges: ages
        };

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/welfare/profile/${familyId}`, postBody, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setProfile(res.data.data);
            setSuccessMessage('Welfare profile updated and eligibility recalculated successfully!');
            setActiveSubTab('dashboard');
        } catch (err) {
            console.error("Save profile error:", err);
            setError(err.response?.data?.message || 'Failed to update demographics profile.');
        } finally {
            setSaving(false);
        }
    };

    const toggleSchemeApply = async (schemeId, currentStatus) => {
        const nextStatus = currentStatus === 'Eligible' ? 'Applied' : 'Eligible';
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/welfare/apply/${familyId}/${schemeId}`, 
                { status: nextStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            setProfile(res.data.data);
        } catch (err) {
            console.error("Toggle apply error:", err);
            setError('Failed to update scheme status.');
        }
    };

    const updateAppliedStatus = async (schemeId, status) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/welfare/apply/${familyId}/${schemeId}`, 
                { status },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            setProfile(res.data.data);
        } catch (err) {
            console.error("Update status error:", err);
            setError('Failed to update scheme application status.');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <RefreshCw className="animate-spin text-indigo-600 mr-2" size={24} />
                <span className="font-semibold text-slate-600">Loading benefits data...</span>
            </div>
        );
    }

    // Calculate aggregated metrics
    const eligibleSchemes = profile?.recommendations || [];
    const appliedList = profile?.appliedSchemes || [];
    
    // Total potential financial benefit summation
    const totalPotentialBenefits = eligibleSchemes.reduce((sum, s) => {
        // Exclude healthcare (valued as insurance up to 5L) or credit Mudra loan (valued as liquidity, not direct income benefit) from direct cash totals
        if (s.id !== 'ayushman-bharat' && s.id !== 'pmmy') {
            return sum + s.estimatedFinancialImpact;
        }
        return sum;
    }, 0);

    const activeDeadlines = eligibleSchemes.filter(s => s.deadline !== 'Ongoing' && s.deadline !== 'Ongoing / No deadline');

    // Filter categories
    const categories = ['All', ...new Set(welfareSchemesRegistry.map(s => s.category))];
    const filteredSchemes = eligibleSchemes.filter(s => categoryFilter === 'All' || s.category === categoryFilter);

    // Get list of applied scheme profiles
    const appliedSchemesFull = appliedList.map(a => {
        const schemeDetails = welfareSchemesRegistry.find(s => s.id === a.schemeId);
        return {
            ...a,
            details: schemeDetails
        };
    }).filter(a => a.details);

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 pb-12 animate-in fade-in duration-300">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 p-8 rounded-3xl text-white shadow-xl">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Sparkles className="text-yellow-300 animate-pulse" size={24} />
                        <h2 className="text-3xl font-extrabold tracking-tight">Government Welfare Schemes</h2>
                    </div>
                    <p className="text-blue-100 max-w-lg">
                        Explore matching central and state benefit programs based on family demographics, calculate potential annual impact, and secure application support links.
                    </p>
                </div>
                <button 
                    onClick={() => setActiveSubTab(activeSubTab === 'form' ? 'dashboard' : 'form')}
                    className="flex items-center gap-2 bg-white text-indigo-700 px-6 py-3 rounded-2xl hover:bg-slate-50 transition-all font-bold shadow-md transform hover:scale-105 active:scale-98"
                >
                    <FileText size={18} />
                    {profile ? 'Edit Welfare Profile' : 'Configure Profile'}
                </button>
            </div>

            {/* Sub-tab navigation */}
            <div className="flex border-b border-slate-200 gap-4">
                <button
                    onClick={() => setActiveSubTab('dashboard')}
                    className={`pb-4 px-6 font-bold text-sm transition-all border-b-2 ${
                        activeSubTab === 'dashboard' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    Benefits Dashboard
                </button>
                <button
                    onClick={() => setActiveSubTab('applied')}
                    className={`pb-4 px-6 font-bold text-sm transition-all border-b-2 flex items-center gap-2 ${
                        activeSubTab === 'applied' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    Applied Log
                    <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-bold">
                        {appliedList.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveSubTab('form')}
                    className={`pb-4 px-6 font-bold text-sm transition-all border-b-2 ${
                        activeSubTab === 'form' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    Welfare Demographics Form
                </button>
            </div>

            {/* Error or Success alerts */}
            {error && (
                <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl text-sm font-semibold">
                    <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
                    <span>{error}</span>
                </div>
            )}
            {successMessage && (
                <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl text-sm font-semibold">
                    <CheckCircle2 className="flex-shrink-0 mt-0.5" size={18} />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* Tab 1: Benefits Dashboard */}
            {activeSubTab === 'dashboard' && (
                <div className="space-y-8">
                    {!profile ? (
                        <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-3xl max-w-xl mx-auto flex flex-col items-center p-8">
                            <ShieldAlert className="text-indigo-500 mb-4 animate-bounce" size={48} />
                            <h3 className="text-xl font-bold text-slate-800 mb-2">No Profile Configured</h3>
                            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                                Enter your family's annual income, occupation, and state of residence to run the matching engine and calculate eligible government programs.
                            </p>
                            <button
                                onClick={() => setActiveSubTab('form')}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                            >
                                Set Up Welfare Profile
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* KPI Metrics row */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
                                    <div>
                                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Potential Cash Benefits</span>
                                        <h3 className="text-2xl font-black text-slate-900 mt-1">₹{totalPotentialBenefits.toLocaleString('en-IN')}<span className="text-xs font-bold text-slate-400">/yr</span></h3>
                                        <p className="text-[10px] text-slate-500 mt-2 font-medium">Excludes healthcare/loan limits</p>
                                    </div>
                                    <div className="p-3.5 bg-emerald-50 rounded-2xl text-emerald-600"><Coins size={24} /></div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
                                    <div>
                                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Matched Schemes</span>
                                        <h3 className="text-2xl font-black text-slate-900 mt-1">{eligibleSchemes.length} Eligible</h3>
                                        <p className="text-[10px] text-slate-500 mt-2 font-medium">Ready for application</p>
                                    </div>
                                    <div className="p-3.5 bg-blue-50 rounded-2xl text-blue-600"><UserCheck size={24} /></div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
                                    <div>
                                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Applications</span>
                                        <h3 className="text-2xl font-black text-slate-900 mt-1">{appliedList.length} Logged</h3>
                                        <p className="text-[10px] text-slate-500 mt-2 font-medium">Tracking status in log</p>
                                    </div>
                                    <div className="p-3.5 bg-purple-50 rounded-2xl text-purple-600"><FileText size={24} /></div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
                                    <div>
                                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Upcoming Deadlines</span>
                                        <h3 className="text-2xl font-black text-slate-900 mt-1">{activeDeadlines.length} Schemes</h3>
                                        <p className="text-[10px] text-slate-500 mt-2 font-medium">Prepare applications early</p>
                                    </div>
                                    <div className="p-3.5 bg-rose-50 rounded-2xl text-rose-600"><Clock size={24} /></div>
                                </div>
                            </div>

                            {/* Main Grid: Filters, Scheme Cards list */}
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200/50 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Category Filter:</span>
                                        <div className="flex flex-wrap gap-2">
                                            {categories.map(cat => (
                                                <button
                                                    key={cat}
                                                    onClick={() => setCategoryFilter(cat)}
                                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer
                                                        ${categoryFilter === cat 
                                                            ? 'bg-indigo-600 text-white shadow-sm' 
                                                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-400 font-semibold uppercase">
                                        Showing {filteredSchemes.length} schemes
                                    </div>
                                </div>

                                {filteredSchemes.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-3xl border border-slate-100">
                                        <Info size={36} className="text-slate-300 mx-auto mb-2" />
                                        <p className="text-slate-500 text-sm font-semibold">No schemes match the selected category filters.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {filteredSchemes.map((scheme) => {
                                            const isAlreadyApplied = appliedList.some(al => al.schemeId === scheme.id);
                                            const applicationDetails = appliedList.find(al => al.schemeId === scheme.id);
                                            const isApproved = applicationDetails?.status === 'Approved';
                                            
                                            return (
                                                <div 
                                                    key={scheme.id} 
                                                    className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                                                >
                                                    <div className="space-y-4">
                                                        {/* Header: Title and Category badge */}
                                                        <div className="flex justify-between items-start gap-4">
                                                            <div className="space-y-1">
                                                                <h4 className="font-extrabold text-slate-800 text-base tracking-tight leading-snug">
                                                                    {scheme.name}
                                                                </h4>
                                                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-xl">
                                                                    {categoryIcons[scheme.category] || <Bookmark size={14} />}
                                                                    {scheme.category}
                                                                </span>
                                                            </div>
                                                            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border
                                                                ${scheme.eligibilityScore >= 90 
                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                                                    : 'bg-amber-50 text-amber-700 border-amber-100'}`}
                                                            >
                                                                {scheme.eligibilityScore >= 90 ? 'Fully Eligible' : 'Partially Eligible'}
                                                            </span>
                                                        </div>

                                                        {/* Benefits callout */}
                                                        <div className="p-4 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl">
                                                            <span className="block text-[9px] font-black uppercase text-indigo-500 tracking-wider mb-1">Expected Benefits & Savings</span>
                                                            <p className="text-xs font-bold text-indigo-950 leading-relaxed">{scheme.benefits}</p>
                                                        </div>

                                                        {/* AI whyRecommended explanation */}
                                                        <div className="space-y-1">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">AI Advisement Explanation</span>
                                                            <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                                                {scheme.aiExplanation}
                                                            </p>
                                                        </div>

                                                        {/* Document requirements */}
                                                        <div className="space-y-2">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Required Documents checklist</span>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {scheme.requiredDocuments?.map((doc, idx) => (
                                                                    <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                                                        <Check size={12} className="text-emerald-500 flex-shrink-0" />
                                                                        <span className="truncate">{doc}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Footer Buttons and toggles */}
                                                    <div className="border-t border-slate-100 pt-5 mt-6 flex flex-col gap-4">
                                                        <div className="flex justify-between items-center text-xs text-slate-400 font-bold">
                                                            <span>Deadline: {scheme.deadline}</span>
                                                            {isAlreadyApplied && (
                                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border
                                                                    ${isApproved 
                                                                        ? 'bg-green-50 text-green-700 border-green-200' 
                                                                        : 'bg-purple-50 text-purple-700 border-purple-200'}`}
                                                                >
                                                                    Status: {applicationDetails.status}
                                                                </span>
                                                            )}
                                                        </div>
                                                        
                                                        <div className="flex gap-3">
                                                            {/* Learn More & Apply links */}
                                                            <a 
                                                                href={scheme.officialLink} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="flex-1 text-center py-2.5 bg-slate-50 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-100 border border-slate-200 transition-colors flex items-center justify-center gap-1.5"
                                                            >
                                                                Learn More <ExternalLink size={12} />
                                                            </a>
                                                            <a 
                                                                href={scheme.applyLink} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="flex-1 text-center py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10"
                                                            >
                                                                Apply Now <ArrowRight size={12} />
                                                            </a>
                                                            
                                                            <button
                                                                onClick={() => toggleSchemeApply(scheme.id, isAlreadyApplied ? 'Applied' : 'Eligible')}
                                                                className={`px-3 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer border
                                                                    ${isAlreadyApplied 
                                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' 
                                                                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                                                title={isAlreadyApplied ? 'Mark as Eligible' : 'Mark as Applied'}
                                                            >
                                                                {isAlreadyApplied ? <CheckCircle2 size={16} /> : <FileText size={16} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Tab 2: Applied Log */}
            {activeSubTab === 'applied' && (
                <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="text-xl font-bold text-slate-800">Benefit Application Tracker</h3>
                        <p className="text-slate-400 text-xs font-semibold mt-1">Monitor the status of programs you have applied for.</p>
                    </div>

                    {appliedSchemesFull.length === 0 ? (
                        <div className="p-16 text-center text-slate-400">
                            <FileText className="mx-auto mb-3 opacity-20" size={48} />
                            <p className="text-sm font-semibold">No applications logged yet.</p>
                            <p className="text-xs text-slate-400 mt-1 max-w-[280px] mx-auto leading-relaxed font-semibold">Mark schemes as "Applied" from the dashboard cards to track their progress here.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/75 border-b border-slate-150 text-left text-slate-400 uppercase tracking-wider text-[10px] font-black">
                                        <th className="p-4">Welfare Scheme</th>
                                        <th className="p-4">Category</th>
                                        <th className="p-4">Expected Financial Impact</th>
                                        <th className="p-4">Date Logged</th>
                                        <th className="p-4 w-40">Status Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                                    {appliedSchemesFull.map((scheme) => (
                                        <tr key={scheme.schemeId} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4">
                                                <div className="font-extrabold text-slate-800">{scheme.details.name}</div>
                                                <a 
                                                    href={scheme.details.officialLink} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="text-[10px] font-bold text-indigo-500 hover:underline inline-flex items-center gap-0.5 mt-1"
                                                >
                                                    Portal Link <ExternalLink size={10} />
                                                </a>
                                            </td>
                                            <td className="p-4 font-semibold text-slate-500">
                                                {scheme.details.category}
                                            </td>
                                            <td className="p-4 font-extrabold text-slate-800">
                                                {scheme.details.id === 'ayushman-bharat' || scheme.details.id === 'pmmy'
                                                    ? scheme.details.benefits.split(' at ')[0]
                                                    : `+ ₹${scheme.details.estimatedFinancialImpact.toLocaleString()}/yr`}
                                            </td>
                                            <td className="p-4 text-xs font-semibold text-slate-400">
                                                {new Date(scheme.appliedDate).toLocaleDateString()}
                                            </td>
                                            <td className="p-4">
                                                <select
                                                    value={scheme.status}
                                                    onChange={(e) => updateAppliedStatus(scheme.schemeId, e.target.value)}
                                                    className="text-xs font-bold px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-700 cursor-pointer font-sans"
                                                >
                                                    <option value="Applied">Applied</option>
                                                    <option value="Approved">Approved</option>
                                                    <option value="Rejected">Rejected</option>
                                                    <option value="Eligible">Remove Log</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Tab 3: Welfare Demographics Form */}
            {activeSubTab === 'form' && (
                <div className="bg-white rounded-3xl border border-slate-200/60 p-8 shadow-sm space-y-6 max-w-3xl mx-auto">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="text-indigo-600" /> Family Welfare Profile Setup
                        </h3>
                        <p className="text-xs text-slate-400 font-semibold mt-1">Configure family metrics used to evaluate eligibility.</p>
                    </div>

                    <form onSubmit={handleFormSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Annual Family Income */}
                            <div>
                                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Annual Family Income (₹)</label>
                                <input 
                                    type="number"
                                    name="annualFamilyIncome"
                                    value={formData.annualFamilyIncome}
                                    onChange={(e) => setFormData({...formData, annualFamilyIncome: Number(e.target.value)})}
                                    required
                                    min="0"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                                />
                            </div>

                            {/* Family Size */}
                            <div>
                                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Family Size</label>
                                <input 
                                    type="number"
                                    name="familySize"
                                    value={formData.familySize}
                                    onChange={(e) => setFormData({...formData, familySize: Number(e.target.value)})}
                                    required
                                    min="1"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                                />
                            </div>

                            {/* State */}
                            <div>
                                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">State of Residence</label>
                                <select 
                                    name="state"
                                    value={formData.state}
                                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                                >
                                    {['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'].map(st => (
                                        <option key={st} value={st}>{st}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Gender */}
                            <div>
                                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Gender representation</label>
                                <select 
                                    name="gender"
                                    value={formData.gender}
                                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                                >
                                    <option value="mixed">Mixed (Male & Female members)</option>
                                    <option value="female">Female headed / Female only</option>
                                    <option value="male">Male headed / Male only</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            {/* Member Ages Text (Comma separated list) */}
                            <div>
                                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Ages of Family Members (comma-separated)</label>
                                <input 
                                    type="text"
                                    placeholder="e.g. 45, 42, 18, 12"
                                    name="memberAgesText"
                                    value={formData.memberAgesText}
                                    onChange={(e) => setFormData({...formData, memberAgesText: e.target.value})}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                                />
                            </div>

                            {/* Primary Occupation */}
                            <div>
                                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Primary Household Occupation</label>
                                <select 
                                    name="occupation"
                                    value={formData.occupation}
                                    onChange={(e) => setFormData({...formData, occupation: e.target.value})}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                                >
                                    <option value="salaried">Salaried/Private Employee</option>
                                    <option value="business">Business / Retailer / Self-employed</option>
                                    <option value="agriculture">Agriculture / Farming</option>
                                    <option value="labor">Daily Laborer / Construction worker</option>
                                    <option value="unemployed">Unemployed / Pensioner</option>
                                </select>
                            </div>
                        </div>

                        {/* Status Checkboxes */}
                        <div className="space-y-4 border-t border-slate-100 pt-5">
                            <span className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Demographic Flags & Sub-sectors</span>
                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-2xl cursor-pointer hover:bg-slate-100/50 border border-slate-200/40">
                                    <input 
                                        type="checkbox"
                                        checked={formData.isStudent}
                                        onChange={(e) => setFormData({...formData, isStudent: e.target.checked})}
                                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-slate-800 block">Has Active Students</span>
                                        <span className="text-[10px] text-slate-400 block font-semibold">Scholarships & Education aid</span>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-2xl cursor-pointer hover:bg-slate-100/50 border border-slate-200/40">
                                    <input 
                                        type="checkbox"
                                        checked={formData.isFarmer}
                                        onChange={(e) => setFormData({...formData, isFarmer: e.target.checked})}
                                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-slate-800 block">Has Active Farmers</span>
                                        <span className="text-[10px] text-slate-400 block font-semibold">Agricultural subsidies (PM-KISAN)</span>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-2xl cursor-pointer hover:bg-slate-100/50 border border-slate-200/40">
                                    <input 
                                        type="checkbox"
                                        checked={formData.isDisabled}
                                        onChange={(e) => setFormData({...formData, isDisabled: e.target.checked})}
                                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-slate-800 block">Has Disabled Members</span>
                                        <span className="text-[10px] text-slate-400 block font-semibold">Accident benefits & support quotas</span>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-2xl cursor-pointer hover:bg-slate-100/50 border border-slate-200/40">
                                    <input 
                                        type="checkbox"
                                        checked={formData.isSeniorCitizen}
                                        onChange={(e) => setFormData({...formData, isSeniorCitizen: e.target.checked})}
                                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-slate-800 block">Has Senior Citizens (60+)</span>
                                        <span className="text-[10px] text-slate-400 block font-semibold">Social security pension schemes</span>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-2xl cursor-pointer hover:bg-slate-100/50 border border-slate-200/40 col-span-2">
                                    <input 
                                        type="checkbox"
                                        checked={formData.ownsHome}
                                        onChange={(e) => setFormData({...formData, ownsHome: e.target.checked})}
                                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-slate-800 block">Family Owns a Permanent (Pucca) House</span>
                                        <span className="text-[10px] text-slate-400 block font-semibold">Unchecked to check PMAY housing subsidy eligibility</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/25 disabled:opacity-75 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <>
                                    <RefreshCw className="animate-spin" size={18} />
                                    Evaluating profile demographics via AI...
                                </>
                            ) : (
                                <>
                                    <Check size={18} />
                                    Calculate Benefits Eligibility
                                </>
                            )}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

// 5. Hardcoded copy of schemes registry keys (identical to backend) to parse names/details in logs
const welfareSchemesRegistry = [
    { id: 'pm-kisan', name: 'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)', category: 'Farmers', benefits: '₹6,000 per year DBT' },
    { id: 'pmay', name: 'Pradhan Mantri Awas Yojana (PMAY)', category: 'Housing', benefits: 'Up to ₹2.67 Lakh interest subsidy' },
    { id: 'ayushman-bharat', name: 'Ayushman Bharat Pradhan Mantri Jan Arogya Yojana (PM-JAY)', category: 'Healthcare', benefits: 'Cashless healthcare cover of up to ₹5,00,000/yr' },
    { id: 'pm-sym', name: 'Pradhan Mantri Shram Yogi Maan-dhan (PM-SYM)', category: 'Pension', benefits: 'Assured monthly pension of ₹3,000' },
    { id: 'pmsby', name: 'Pradhan Mantri Suraksha Bima Yojana (PMSBY)', category: 'Insurance', benefits: 'Accidental death/disability cover of ₹2 Lakh' },
    { id: 'pmjjby', name: 'Pradhan Mantri Jeevan Jyoti Bima Yojana (PMJJBY)', category: 'Insurance', benefits: 'Life insurance cover of ₹2 Lakh' },
    { id: 'pmmy', name: 'Pradhan Mantri MUDRA Yojana (PMMY)', category: 'Business Loans', benefits: 'Collateral-free business loans up to ₹10 Lakhs' },
    { id: 'post-matric-scholarship', name: 'Post Matric Scholarship Scheme', category: 'Scholarships', benefits: 'Complete tuition fee waiver & allowances' },
    { id: 'gruha-lakshmi', name: 'Gruha Lakshmi Scheme (Karnataka State)', category: 'Women Welfare', benefits: 'Monthly financial assistance of ₹2,000' },
    { id: 'kanya-sumangala', name: 'Mukhya Mantri Kanya Sumangala Yojana (Uttar Pradesh)', category: 'Women Welfare', benefits: '₹15,000 cash incentive' }
];
