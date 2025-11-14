import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export default function Expenses() {
    const navigate = useNavigate();
    const [expenses, setExpenses] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        category: 'food',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash'
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) navigate('/login');
        else fetchExpenses(token);
    }, [navigate]);

    const fetchExpenses = async (token) => {
        try {
            const response = await axios.get(`${API_URL}/expense`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setExpenses(response.data.expenses);
        } catch (error) {
            console.error('Error fetching expenses:', error);
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
            await axios.post(`${API_URL}/expense`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFormData({
                category: 'food',
                amount: '',
                description: '',
                date: new Date().toISOString().split('T')[0],
                paymentMethod: 'cash'
            });
            setShowForm(false);
            fetchExpenses(token);
        } catch (error) {
            console.error('Error adding expense:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`${API_URL}/expense/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchExpenses(token);
        } catch (error) {
            console.error('Error deleting expense:', error);
        }
    };

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Expense Manager</h1>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
                    >
                        {showForm ? 'Cancel' : 'Add Expense'}
                    </button>
                </div>

                {/* Summary Card */}
                <div className="bg-red-500 text-white rounded-lg shadow p-6 mb-8">
                    <p className="text-gray-100">Total Expenses</p>
                    <p className="text-4xl font-bold">₹{totalExpenses.toFixed(2)}</p>
                </div>

                {/* Add Form */}
                {showForm && (
                    <div className="bg-white rounded-lg shadow p-6 mb-8">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">Category</label>
                                    <select
                                        name="category"
                                        value={formData.category}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    >
                                        <option value="food">Food</option>
                                        <option value="transport">Transport</option>
                                        <option value="utilities">Utilities</option>
                                        <option value="entertainment">Entertainment</option>
                                        <option value="shopping">Shopping</option>
                                        <option value="healthcare">Healthcare</option>
                                        <option value="education">Education</option>
                                        <option value="insurance">Insurance</option>
                                        <option value="rent">Rent</option>
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
                                    <label className="block text-gray-700 font-semibold mb-2">Payment Method</label>
                                    <select
                                        name="paymentMethod"
                                        value={formData.paymentMethod}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="credit_card">Credit Card</option>
                                        <option value="debit_card">Debit Card</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="upi">UPI</option>
                                    </select>
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
                                {loading ? 'Adding...' : 'Add Expense'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Expenses List */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-gray-900 font-semibold">Date</th>
                                <th className="px-6 py-3 text-left text-gray-900 font-semibold">Category</th>
                                <th className="px-6 py-3 text-left text-gray-900 font-semibold">Description</th>
                                <th className="px-6 py-3 text-left text-gray-900 font-semibold">Amount</th>
                                <th className="px-6 py-3 text-left text-gray-900 font-semibold">Method</th>
                                <th className="px-6 py-3 text-left text-gray-900 font-semibold">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.map(expense => (
                                <tr key={expense._id} className="border-t hover:bg-gray-50">
                                    <td className="px-6 py-4">{new Date(expense.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 capitalize">{expense.category}</td>
                                    <td className="px-6 py-4">{expense.description}</td>
                                    <td className="px-6 py-4 font-semibold">₹{expense.amount.toFixed(2)}</td>
                                    <td className="px-6 py-4 capitalize">{expense.paymentMethod.replace('_', ' ')}</td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleDelete(expense._id)}
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
