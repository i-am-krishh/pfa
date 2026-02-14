import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Wallet, Plus, Trash2, Calendar, Tag, FileText, TrendingUp, Filter, Search, X, CheckCircle2, Cross } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function Income() {
    const navigate = useNavigate();
    const [incomes, setIncomes] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [filterCategory, setFilterCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Form State
    const [formData, setFormData] = useState({
        source: 'salary',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        category: '',
        isRecurring: false,
        frequency: 'monthly'
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) navigate('/login');
        else fetchIncomes(token);
    }, [navigate]);

    const fetchIncomes = async (token) => {
        try {
            const response = await axios.get(`${API_URL}/income`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIncomes(response.data.incomes);
        } catch (error) {
            console.error('Error fetching incomes:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        setLoading(true);

        try {
            await axios.post(`${API_URL}/income`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Reset form
            setFormData({
                source: 'salary',
                amount: '',
                description: '',
                date: new Date().toISOString().split('T')[0],
                category: '',
                isRecurring: false,
                frequency: 'monthly'
            });
            setShowForm(false);
            fetchIncomes(token);
        } catch (error) {
            console.error('Error adding income:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this record?')) return;
        
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`${API_URL}/income/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchIncomes(token);
        } catch (error) {
            console.error('Error deleting income:', error);
        }
    };

    const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
    
    // Filtering logic
    const filteredIncomes = incomes.filter(income => {
        const matchesCategory = filterCategory === 'all' || income.source === filterCategory;
        const matchesSearch = income.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              income.category.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const categories = ['salary', 'freelance', 'investment', 'bonus', 'gift', 'other'];

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-10">
            {/* Header / Stats */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-emerald-100/50 rounded-xl">
                             <Wallet className="text-emerald-600" size={32} />
                        </div>
                        Income Manager
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">Track your earnings and revenue streams</p>
                </div>
                
                <div className="bg-emerald-600 text-white rounded-2xl p-6 shadow-lg shadow-emerald-600/20 min-w-[280px] hover:scale-105 transition-transform duration-300">
                    <div className="flex items-center gap-2 mb-2 opacity-90">
                        <TrendingUp size={18} />
                        <span className="font-medium text-sm uppercase tracking-wide">Total Income</span>
                    </div>
                    <div className="text-4xl font-bold">₹{totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                    <div className="text-emerald-100 text-sm mt-2 opacity-80">All time earnings</div>
                </div>
            </div>

            {/* Controls & Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative group w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-emerald-500 transition-colors" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search transactions..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        />
                    </div>
                    <div className="relative w-full md:w-48">
                         <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                         <select 
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none cursor-pointer capitalize"
                         >
                            <option value="all">All Sources</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                         </select>
                    </div>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                >
                    <Plus size={20} />
                    Log Income
                </button>
            </div>

            {/* Income List - Modern Table/Grid */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {filteredIncomes.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center text-slate-400">
                        <Wallet size={48} className="mb-4 opacity-20" />
                        <h3 className="text-lg font-medium text-slate-600">No income records found</h3>
                        <p className="max-w-xs mx-auto mt-1">Try adjusting your filters or add a new income source.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Source</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredIncomes.map((income) => (
                                    <tr key={income._id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <Calendar size={14} className="text-slate-400"/>
                                                {new Date(income.date).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border capitalize
                                                ${income.source === 'salary' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                                                  income.source === 'freelance' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                  income.source === 'investment' ? 'bg-green-50 text-green-700 border-green-100' :
                                                  'bg-slate-50 text-slate-700 border-slate-200'
                                                }`}>
                                                {income.isRecurring && <CheckCircle2 size={10} />}
                                                {income.source}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <Tag size={14} className="text-slate-400" />
                                                {income.category || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                                            {income.description || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-slate-900">
                                            +₹{income.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <button 
                                                onClick={() => handleDelete(income._id)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                title="Delete Record"
                                            >
                                                <Cross size={16} />
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
                            <h3 className="text-lg font-bold text-slate-800">Add New Income</h3>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Amount (₹)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleChange}
                                        required
                                        placeholder="0.00"
                                        className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Source</label>
                                    <select
                                        name="source"
                                        value={formData.source}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none capitalize"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date</label>
                                    <input
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-600"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category Tag</label>
                                <input
                                    type="text"
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    placeholder="e.g. Monthly Salary, Diwali Bonus"
                                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none placeholder:text-slate-300"
                                />
                            </div>

                            <div>
                                <label className="flex items-center gap-2 cursor-pointer mb-2">
                                    <div className="relative inline-flex items-center">
                                        <input 
                                            type="checkbox" 
                                            name="isRecurring"
                                            checked={formData.isRecurring}
                                            onChange={handleChange}
                                            className="sr-only peer" 
                                        />
                                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">Recurring Income?</span>
                                </label>
                                
                                {formData.isRecurring && (
                                    <div className="pl-2 border-l-2 border-emerald-100 mt-2">
                                        <select
                                            name="frequency"
                                            value={formData.frequency}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                                        >
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="monthly">Monthly</option>
                                            <option value="yearly">Yearly</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description (Optional)</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows="2"
                                    placeholder="Add any additional notes..."
                                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none placeholder:text-slate-300 resize-none"
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100"
                                >
                                    {loading ? 'Adding...' : 'Add Income Record'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
