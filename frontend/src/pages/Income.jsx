import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'https://pfa-1fqq.vercel.app/api';

export default function Income() {
    const navigate = useNavigate();
    const [incomes, setIncomes] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        source: 'salary',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        category: '',
        isRecurring: false,
        frequency: null
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
            setFormData({
                source: 'salary',
                amount: '',
                description: '',
                date: new Date().toISOString().split('T')[0],
                category: '',
                isRecurring: false,
                frequency: null
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

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Income Manager</h1>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
                    >
                        {showForm ? 'Cancel' : 'Add Income'}
                    </button>
                </div>

                {/* Summary Card */}
                <div className="bg-green-500 text-white rounded-lg shadow p-6 mb-8">
                    <p className="text-gray-100">Total Income</p>
                    <p className="text-4xl font-bold">₹{totalIncome.toFixed(2)}</p>
                </div>

                {/* Add Form */}
                {showForm && (
                    <div className="bg-white rounded-lg shadow p-6 mb-8">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">Source</label>
                                    <select
                                        name="source"
                                        value={formData.source}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    >
                                        <option value="salary">Salary</option>
                                        <option value="freelance">Freelance</option>
                                        <option value="investment">Investment</option>
                                        <option value="bonus">Bonus</option>
                                        <option value="gift">Gift</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">Amount</label>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">Date</label>
                                    <input
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">Category</label>
                                    <input
                                        type="text"
                                        name="category"
                                        value={formData.category}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                        placeholder="e.g., Monthly Salary"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center space-x-4">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        name="isRecurring"
                                        checked={formData.isRecurring}
                                        onChange={handleChange}
                                        className="mr-2"
                                    />
                                    <span className="text-gray-700">Recurring Income</span>
                                </label>
                                {formData.isRecurring && (
                                    <select
                                        name="frequency"
                                        value={formData.frequency || ''}
                                        onChange={handleChange}
                                        className="px-4 py-2 border border-gray-300 rounded-lg"
                                    >
                                        <option value="">Select Frequency</option>
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="yearly">Yearly</option>
                                    </select>
                                )}
                            </div>

                            <div>
                                <label className="block text-gray-700 font-semibold mb-2">Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    placeholder="Add notes..."
                                    rows="3"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg disabled:opacity-50"
                            >
                                {loading ? 'Adding...' : 'Add Income'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Incomes List */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-gray-900 font-semibold">Date</th>
                                <th className="px-6 py-3 text-left text-gray-900 font-semibold">Source</th>
                                <th className="px-6 py-3 text-left text-gray-900 font-semibold">Category</th>
                                <th className="px-6 py-3 text-left text-gray-900 font-semibold">Description</th>
                                <th className="px-6 py-3 text-left text-gray-900 font-semibold">Amount</th>
                                <th className="px-6 py-3 text-left text-gray-900 font-semibold">Type</th>
                                <th className="px-6 py-3 text-left text-gray-900 font-semibold">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {incomes.map(income => (
                                <tr key={income._id} className="border-t hover:bg-gray-50">
                                    <td className="px-6 py-4">{new Date(income.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 capitalize">{income.source}</td>
                                    <td className="px-6 py-4">{income.category}</td>
                                    <td className="px-6 py-4">{income.description}</td>
                                    <td className="px-6 py-4 font-semibold">₹{income.amount.toFixed(2)}</td>
                                    <td className="px-6 py-4">{income.isRecurring ? `${income.frequency} (Recurring)` : 'One-time'}</td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleDelete(income._id)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
