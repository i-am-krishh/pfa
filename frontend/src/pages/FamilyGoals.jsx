import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Target, Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const FamilyGoals = ({ familyId }) => {
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Form state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formData, setFormData] = useState({
        goalName: '',
        targetAmount: '',
        deadline: ''
    });

    // Contribution state
    const [contributeGoalId, setContributeGoalId] = useState(null);
    const [contributionAmount, setContributionAmount] = useState('');

    const fetchGoals = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/family/goals/${familyId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setGoals(res.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch goals');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGoals();
    }, [familyId]);

    const handleCreateGoal = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/family/goals`, 
                { ...formData, familyId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setIsFormOpen(false);
            setFormData({ goalName: '', targetAmount: '', deadline: '' });
            fetchGoals();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to create goal');
        }
    };

    const handleContribute = async (e, goalId) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${import.meta.env.VITE_API_BASE_URL}/family/goals/${familyId}/${goalId}/contribute`, 
                { amount: contributionAmount },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setContributeGoalId(null);
            setContributionAmount('');
            fetchGoals();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to contribute to goal');
        }
    };

    const handleDelete = async (goalId) => {
        if (!window.confirm('Are you sure you want to delete this goal?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/family/goals/${familyId}/${goalId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchGoals();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete goal');
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Shared Goals</h2>
                    <p className="text-slate-500 text-sm">Track what your family is saving for.</p>
                </div>
                <button 
                    onClick={() => setIsFormOpen(!isFormOpen)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors font-semibold shadow-sm"
                >
                    <Plus size={20} /> Create Goal
                </button>
            </div>

            {error && <div className="text-red-500 bg-red-50 p-4 rounded-xl">{error}</div>}

            {/* Create Goal Form */}
            {isFormOpen && (
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">New Family Goal</h3>
                    <form onSubmit={handleCreateGoal} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="col-span-1">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Goal Name</label>
                            <input 
                                type="text" required
                                value={formData.goalName} 
                                onChange={(e) => setFormData({...formData, goalName: e.target.value})}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                                placeholder="e.g. Family Vacation"
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Target Amount</label>
                            <input 
                                type="number" required min="1" step="0.01"
                                value={formData.targetAmount} 
                                onChange={(e) => setFormData({...formData, targetAmount: e.target.value})}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Deadline (Optional)</label>
                            <input 
                                type="date" 
                                value={formData.deadline} 
                                onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                            />
                        </div>
                        <div className="col-span-1 md:col-span-3 flex justify-end gap-3 mt-2">
                            <button 
                                type="button" 
                                onClick={() => setIsFormOpen(false)}
                                className="px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                Save Goal
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Goals Grid */}
            {goals.length === 0 && !isFormOpen ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 border-dashed">
                    <Target className="mx-auto text-slate-300 mb-3" size={48} />
                    <p className="text-slate-500">No active goals found. Start saving together!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {goals.map(goal => (
                        <div key={goal._id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative group overflow-hidden">
                            {/* Status Tag */}
                            <div className="absolute top-4 right-4">
                                {goal.estimatedStatus === 'completed' ? (
                                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md uppercase tracking-wider">
                                        <CheckCircle size={14} /> Completed
                                    </span>
                                ) : goal.estimatedStatus === 'overdue' ? (
                                    <span className="flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md uppercase tracking-wider">
                                        <AlertCircle size={14} /> Overdue
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md uppercase tracking-wider">
                                        <Clock size={14} /> On Track
                                    </span>
                                )}
                            </div>

                            <h3 className="text-xl font-bold text-slate-800 pr-24 mb-1">{goal.goalName}</h3>
                            <p className="text-sm text-slate-500 mb-6">
                                {goal.deadline ? `Target: ${new Date(goal.deadline).toLocaleDateString()}` : 'No deadline set'}
                            </p>

                            <div className="mb-4">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-2xl font-bold text-slate-800">${goal.currentAmount}</span>
                                    <span className="text-sm font-semibold text-slate-500">of ${goal.targetAmount}</span>
                                </div>
                                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-500 ${goal.estimatedStatus === 'completed' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                        style={{ width: `${Math.min(goal.progressPercentage, 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-xs font-bold text-slate-400">{goal.progressPercentage}%</span>
                                    {goal.estimatedStatus !== 'completed' && (
                                        <span className="text-xs font-bold text-slate-400">${goal.remainingAmount} to go</span>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-6 border-t border-slate-100 pt-4 flex gap-2">
                                {contributeGoalId === goal._id ? (
                                    <form onSubmit={(e) => handleContribute(e, goal._id)} className="flex gap-2 w-full">
                                        <input 
                                            type="number" min="1" step="0.01" required
                                            value={contributionAmount}
                                            onChange={(e) => setContributionAmount(e.target.value)}
                                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-sm"
                                            placeholder="Amount"
                                            autoFocus
                                        />
                                        <button type="submit" className="px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm font-semibold">Add</button>
                                        <button type="button" onClick={() => setContributeGoalId(null)} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold">Cancel</button>
                                    </form>
                                ) : (
                                    <>
                                        {goal.estimatedStatus !== 'completed' && (
                                            <button 
                                                onClick={() => setContributeGoalId(goal._id)}
                                                className="flex-1 py-2 bg-indigo-50 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-100 transition-colors"
                                            >
                                                Contribute
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleDelete(goal._id)}
                                            className="px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FamilyGoals;
