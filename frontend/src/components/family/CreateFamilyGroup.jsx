import React, { useState } from 'react';
import axios from 'axios';
import { Copy, Check, Users } from 'lucide-react';

const CreateFamilyGroup = ({ onCreated }) => {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successData, setSuccessData] = useState(null);
    const [copied, setCopied] = useState(false);

    const handleCreate = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/family/create`, 
                { name },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            setSuccessData(res.data.data);
            if (onCreated) onCreated();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create family group');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (successData?.familyCode) {
            navigator.clipboard.writeText(successData.familyCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (successData) {
        return (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Family Group Created!</h3>
                <p className="text-slate-600 mb-6">Share this code with your family members so they can join.</p>
                
                <div className="flex items-center justify-center space-x-3 bg-slate-50 p-4 rounded-xl mb-6">
                    <span className="text-2xl font-mono font-bold tracking-widest text-indigo-700">
                        {successData.familyCode}
                    </span>
                    <button 
                        onClick={copyToClipboard}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Copy Code"
                    >
                        {copied ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} />}
                    </button>
                </div>

                <button 
                    onClick={() => window.location.reload()}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-semibold"
                >
                    Go to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                    <Users size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Create Family Group</h2>
                    <p className="text-sm text-slate-500">Start a new shared financial space.</p>
                </div>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg mb-4 text-sm">{error}</div>}

            <form onSubmit={handleCreate}>
                <div className="mb-4">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Family Name</label>
                    <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        placeholder="e.g. The Smiths"
                        required
                    />
                </div>
                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-semibold disabled:opacity-70 flex justify-center items-center"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        'Create Group'
                    )}
                </button>
            </form>
        </div>
    );
};

export default CreateFamilyGroup;
