import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { PiggyBank, Plus, Trash2, Calendar, Target, TrendingUp, X, Percent, Wallet, ArrowUpRight } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export default function Savings() {
    const navigate = useNavigate();
    const [savings, setSavings] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        accountName: '',
        accountType: 'savings_account',
        amount: '',
        interestRate: '',
        maturityDate: '',
        description: ''
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) navigate('/login');
        else fetchSavings(token);
    }, [navigate]);

    const fetchSavings = async (token) => {
        try {
            const response = await axios.get(`${API_URL}/savings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSavings(response.data.savings);
        } catch (error) {
            console.error('Error fetching savings:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        setLoading(true);

        try {
            await axios.post(`${API_URL}/savings`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFormData({
                accountName: '',
                accountType: 'savings_account',
                amount: '',
                interestRate: '',
                maturityDate: '',
                description: ''
            });
            setShowForm(false);
            fetchSavings(token);
        } catch (error) {
            console.error('Error adding savings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this account?')) return;
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`${API_URL}/savings/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchSavings(token);
        } catch (error) {
            console.error('Error deleting savings:', error);
        }
    };

    const totalSavings = savings.reduce((sum, s) => sum + s.amount, 0);

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-blue-100/50 rounded-xl">
                             <PiggyBank className="text-blue-600" size={32} />
                        </div>
                        Savings & Deposits
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">Manage your liquid assets and emergency funds</p>
                </div>
                
                <div className="bg-blue-600 text-white rounded-2xl p-6 shadow-lg shadow-blue-600/20 min-w-[280px] hover:scale-105 transition-transform duration-300">
                    <div className="flex items-center gap-2 mb-2 opacity-90">
                        <Wallet size={18} />
                        <span className="font-medium text-sm uppercase tracking-wide">Total Savings</span>
                    </div>
                    <div className="text-4xl font-bold">₹{totalSavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                    <div className="text-blue-100 text-sm mt-2 opacity-80">Accumulated balance</div>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="text-sm text-slate-500">
                    Showing <span className="font-semibold text-slate-900">{savings.length}</span> accounts
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-md shadow-blue-600/20 transition-all active:scale-95"
                >
                    <Plus size={20} />
                    Add Account/Deposit
                </button>
            </div>

            {/* Savings Grid */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {savings.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center text-slate-400">
                        <PiggyBank size={48} className="mb-4 opacity-20" />
                        <h3 className="text-lg font-medium text-slate-600">No savings accounts found</h3>
                        <p className="max-w-xs mx-auto mt-1">Start building your safety net today.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Name</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Maturity Date</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Balance</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {savings.map((saving) => (
                                    <tr key={saving._id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                                    <Target size={18} />
                                                </div>
                                                <div className="font-semibold text-slate-700">{saving.accountName}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-50 text-slate-700 border-slate-200 capitalize">
                                                {saving.accountType.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                             {saving.interestRate ? (
                                                 <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 w-fit">
                                                     <ArrowUpRight size={12}/> {saving.interestRate}% Interest
                                                 </div>
                                             ) : (
                                                 <span className="text-slate-400 text-xs">-</span>
                                             )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                            {saving.maturityDate ? (
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} className="text-slate-400"/>
                                                    {new Date(saving.maturityDate).toLocaleDateString()}
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-blue-600">
                                            ₹{saving.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <button 
                                                onClick={() => handleDelete(saving._id)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                title="Delete Account"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Form */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-800">Add New Savings</h3>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Account Name</label>
                                <input
                                    type="text"
                                    name="accountName"
                                    value={formData.accountName}
                                    onChange={handleChange}
                                    required
                                    placeholder="e.g. Emergency Fund, HDFC FD"
                                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Type</label>
                                    <select
                                        name="accountType"
                                        value={formData.accountType}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none capitalize"
                                    >
                                        <option value="savings_account">Savings Acc.</option>
                                        <option value="fixed_deposit">Fixed Deposit</option>
                                        <option value="recurring_deposit">RD</option>
                                        <option value="cash">Cash</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Balance (₹)</label>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleChange}
                                        required
                                        placeholder="0.00"
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Interest (%)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            name="interestRate"
                                            value={formData.interestRate}
                                            onChange={handleChange}
                                            step="0.01"
                                            placeholder="0.0"
                                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                                        />
                                        <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Maturity Date</label>
                                    <input
                                        type="date"
                                        name="maturityDate"
                                        value={formData.maturityDate}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-600"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description (Optional)</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows="2"
                                    placeholder="Add any additional notes..."
                                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none placeholder:text-slate-300 resize-none"
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100"
                                >
                                    {loading ? 'Adding...' : 'Save Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
