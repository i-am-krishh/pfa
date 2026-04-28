import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CreateFamilyGroup from '../components/family/CreateFamilyGroup';
import JoinFamilyGroup from '../components/family/JoinFamilyGroup';
// These will be imported but might be lazy loaded or just imported normally.
// Assuming they exist in pages/
import FamilyDashboard from './FamilyDashboard';
import FamilyManagement from './FamilyManagement';
import FamilyTransactions from './FamilyTransactions';
import FamilyGoals from './FamilyGoals';
import FamilySharingSettings from './FamilySharingSettings';
import FamilyGoalPlanner from './FamilyGoalPlanner';

const FamilyAccessPage = () => {
    const [familyGroup, setFamilyGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('dashboard'); // for admin toggling between dashboard and management

    const fetchMyFamily = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/family/my-family`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Assuming user is only active in one family group for now
            if (res.data.data && res.data.data.length > 0) {
                setFamilyGroup(res.data.data[0]);
            } else {
                setFamilyGroup(null);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch family status');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyFamily();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center">
                <div className="bg-red-50 text-red-600 p-4 rounded-xl inline-block">{error}</div>
            </div>
        );
    }

    // SCENARIO 1: No Family Group
    if (!familyGroup) {
        return (
            <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-slate-800 mb-4">Family Finance</h1>
                    <p className="text-slate-600 max-w-2xl mx-auto">
                        Manage your household finances together. Create a new family group or join an existing one using a code.
                    </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8">
                    <CreateFamilyGroup onCreated={fetchMyFamily} />
                    <JoinFamilyGroup onJoined={fetchMyFamily} />
                </div>
            </div>
        );
    }

    // SCENARIO 2: Pending Approval
    if (familyGroup.myStatus === 'Pending') {
        return (
            <div className="p-4 md:p-8 max-w-2xl mx-auto text-center min-h-screen pt-20">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                    <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Awaiting Approval</h2>
                    <p className="text-slate-600 mb-6">
                        Your request to join <strong>{familyGroup.name}</strong> is currently pending. The family admin must approve your request before you can access the dashboard.
                    </p>
                    <button 
                        onClick={fetchMyFamily}
                        className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-semibold"
                    >
                        Refresh Status
                    </button>
                </div>
            </div>
        );
    }

    // SCENARIO 3: Approved Member or Admin
    if (familyGroup.myStatus === 'Approved' || familyGroup.myRole === 'Admin') {
        return (
            <div className="min-h-screen pb-10">
                {/* Tab Navigation */}
                <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-3 mb-6 sticky top-0 z-10 flex space-x-2 overflow-x-auto scrollbar-hide">
                    <button 
                        onClick={() => setActiveTab('dashboard')}
                        className={`whitespace-nowrap px-4 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Dashboard
                    </button>
                    <button 
                        onClick={() => setActiveTab('transactions')}
                        className={`whitespace-nowrap px-4 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'transactions' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Transactions
                    </button>
                    <button 
                        onClick={() => setActiveTab('goals')}
                        className={`whitespace-nowrap px-4 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'goals' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Goals
                    </button>
                    <button 
                        onClick={() => setActiveTab('settings')}
                        className={`whitespace-nowrap px-4 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'settings' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Sharing Settings
                    </button>
                    <button 
                        onClick={() => setActiveTab('planner')}
                        className={`whitespace-nowrap px-4 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'planner' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        AI Goal Planner
                    </button>
                    
                    {familyGroup.myRole === 'Admin' && (
                        <button 
                            onClick={() => setActiveTab('management')}
                            className={`whitespace-nowrap px-4 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'management' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            Manage Members
                        </button>
                    )}
                </div>

                {/* Main Content */}
                <div className="px-4 md:px-8">
                    {activeTab === 'dashboard' && <FamilyDashboard familyId={familyGroup._id} />}
                    {activeTab === 'transactions' && <FamilyTransactions familyId={familyGroup._id} />}
                    {activeTab === 'goals' && <FamilyGoals familyId={familyGroup._id} />}
                    {activeTab === 'management' && <FamilyManagement familyId={familyGroup._id} />}
                    {activeTab === 'settings' && <FamilySharingSettings familyId={familyGroup._id} />}
                    {activeTab === 'planner' && <FamilyGoalPlanner familyId={familyGroup._id} />}
                </div>
            </div>
        );
    }

    return null; // Fallback
};

export default FamilyAccessPage;
