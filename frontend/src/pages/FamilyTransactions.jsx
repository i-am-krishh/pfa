import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Plus, Trash2, Edit2, TrendingUp, TrendingDown, 
    Calendar, Tag, FileText, IndianRupee, Check, X
} from 'lucide-react';

const FamilyTransactions = ({ familyId }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Form state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formData, setFormData] = useState({
        type: 'expense',
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
    });

    const fetchTransactions = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/family/transactions/${familyId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTransactions(res.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch transactions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, [familyId]);

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/family/transactions`, 
                { ...formData, familyId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setIsFormOpen(false);
            setFormData({ ...formData, amount: '', description: '', category: '' });
            fetchTransactions();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to add transaction');
        }
    };

    const handleDelete = async (id, type) => {
        if (!window.confirm('Are you sure you want to delete this transaction?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/family/transactions/${familyId}/${id}?type=${type}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchTransactions();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete transaction');
        }
    };

    const handleApprove = async (id, type) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${import.meta.env.VITE_API_BASE_URL}/family/transactions/${familyId}/${id}/approve`, { type }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchTransactions();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to approve transaction');
        }
    };

    const handleReject = async (id, type) => {
        const reason = window.prompt("Enter rejection reason (optional):");
        if (reason === null) return;
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${import.meta.env.VITE_API_BASE_URL}/family/transactions/${familyId}/${id}/reject`, { type, rejectionReason: reason }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchTransactions();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to reject transaction');
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
                <h2 className="text-2xl font-bold text-slate-800">Shared Ledger</h2>
                <button 
                    onClick={() => setIsFormOpen(!isFormOpen)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors font-semibold shadow-sm"
                >
                    <Plus size={20} /> Add Transaction
                </button>
            </div>

            {error && <div className="text-red-500 bg-red-50 p-4 rounded-xl">{error}</div>}

            {/* Add Transaction Form Inline */}
            {isFormOpen && (
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Log New Activity</h3>
                    <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="col-span-1">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Type</label>
                            <select 
                                value={formData.type} 
                                onChange={(e) => setFormData({...formData, type: e.target.value})}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                            >
                                <option value="expense">Expense</option>
                                <option value="income">Income</option>
                            </select>
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Amount</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-slate-500 font-semibold">$</span>
                                </div>
                                <input 
                                    type="number" required min="1" step="0.01"
                                    value={formData.amount} 
                                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                    className="w-full pl-8 p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                            <input 
                                type="text" required
                                value={formData.category} 
                                onChange={(e) => setFormData({...formData, category: e.target.value})}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                                placeholder="e.g. Groceries"
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Date</label>
                            <input 
                                type="date" required
                                value={formData.date} 
                                onChange={(e) => setFormData({...formData, date: e.target.value})}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                            />
                        </div>
                        <div className="col-span-1 lg:col-span-5">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Description (Optional)</label>
                            <input 
                                type="text"
                                value={formData.description} 
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                                placeholder="Details..."
                            />
                        </div>
                        <div className="col-span-1 lg:col-span-5 flex justify-end gap-3 mt-2">
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
                                Save Transaction
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Transaction List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
                                <th className="p-4 font-semibold">Date</th>
                                <th className="p-4 font-semibold">Member</th>
                                <th className="p-4 font-semibold">Category</th>
                                <th className="p-4 font-semibold">Description</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold text-right">Amount</th>
                                <th className="p-4 font-semibold text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-500">
                                        No transactions recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                transactions.map(t => (
                                    <tr key={t._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 text-slate-600 text-sm whitespace-nowrap">
                                            {new Date(t.date).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                    {t.userId?.fullName?.charAt(0) || 'U'}
                                                </div>
                                                <span className="text-sm font-medium text-slate-700">{t.userId?.fullName}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                                                {t.category}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-slate-500 max-w-xs truncate">
                                            {t.description || '-'}
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider
                                                ${t.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                                  t.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                  'bg-rose-100 text-rose-700'}`}>
                                                {t.status}
                                            </span>
                                        </td>
                                        <td className={`p-4 text-right font-bold whitespace-nowrap ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-center gap-2">
                                                {t.status === 'pending' && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleApprove(t._id, t.type)}
                                                            className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-md transition-colors"
                                                            title="Approve"
                                                        >
                                                            <Check size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleReject(t._id, t.type)}
                                                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                                                            title="Reject"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </>
                                                )}
                                                <button 
                                                    onClick={() => handleDelete(t._id, t.type)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FamilyTransactions;
