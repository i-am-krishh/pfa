import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Savings Manager</h1>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
                    >
                        {showForm ? 'Cancel' : 'Add Savings'}
                    </button>
                </div>

                {/* Summary Card */}
                <div className="bg-blue-500 text-white rounded-lg shadow p-6 mb-8">
                    <p className="text-gray-100">Total Savings</p>
                    <p className="text-4xl font-bold">₹{totalSavings.toFixed(2)}</p>
                </div>

                {/* Add Form */}
                {showForm && (
                    <div className="bg-white rounded-lg shadow p-6 mb-8">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">Account Name</label>
                                    <input
                                        type="text"
                                        name="accountName"
                                        value={formData.accountName}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                        placeholder="e.g., Emergency Fund"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">Account Type</label>
                                    <select
                                        name="accountType"
                                        value={formData.accountType}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    >
                                        <option value="savings_account">Savings Account</option>
                                        <option value="fixed_deposit">Fixed Deposit</option>
                                        <option value="recurring_deposit">Recurring Deposit</option>
                                        <option value="cash">Cash</option>
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
                                    <label className="block text-gray-700 font-semibold mb-2">Interest Rate (%)</label>
                                    <input
                                        type="number"
                                        name="interestRate"
                                        value={formData.interestRate}
                                        onChange={handleChange}
                                        step="0.01"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-gray-700 font-semibold mb-2">Maturity Date</label>
                                    <input
                                        type="date"
                                        name="maturityDate"
                                        value={formData.maturityDate}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
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
                                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg disabled:opacity-50"
                            >
                                {loading ? 'Adding...' : 'Add Savings'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Savings List */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-gray-900 font-semibold">Account Name</th>
                                <th className="px-6 py-3 text-left text-gray-900 font-semibold">Type</th>
                                <th className="px-6 py-3 text-left text-gray-900 font-semibold">Amount</th>
                                <th className="px-6 py-3 text-left text-gray-900 font-semibold">Interest Rate</th>
                                <th className="px-6 py-3 text-left text-gray-900 font-semibold">Maturity Date</th>
                                <th className="px-6 py-3 text-left text-gray-900 font-semibold">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {savings.map(saving => (
                                <tr key={saving._id} className="border-t hover:bg-gray-50">
                                    <td className="px-6 py-4 font-semibold">{saving.accountName}</td>
                                    <td className="px-6 py-4 capitalize">{saving.accountType.replace('_', ' ')}</td>
                                    <td className="px-6 py-4">₹{saving.amount.toFixed(2)}</td>
                                    <td className="px-6 py-4">{saving.interestRate}%</td>
                                    <td className="px-6 py-4">{saving.maturityDate ? new Date(saving.maturityDate).toLocaleDateString() : 'N/A'}</td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleDelete(saving._id)}
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
