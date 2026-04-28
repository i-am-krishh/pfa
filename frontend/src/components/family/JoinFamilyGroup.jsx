import React, { useState } from 'react';
import axios from 'axios';
import { UserPlus, Check } from 'lucide-react';

const JoinFamilyGroup = ({ onJoined }) => {
    const [familyCode, setFamilyCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleJoin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/family/join`, 
                { familyCode: familyCode.toUpperCase() },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            setSuccess(true);
            if (onJoined) {
                setTimeout(onJoined, 2000);
            } else {
                setTimeout(() => window.location.reload(), 2000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send join request');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Request Sent!</h3>
                <p className="text-slate-600">The family admin needs to approve your request before you can access the dashboard.</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                    <UserPlus size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Join Family Group</h2>
                    <p className="text-sm text-slate-500">Enter a code to join an existing family.</p>
                </div>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg mb-4 text-sm">{error}</div>}

            <form onSubmit={handleJoin}>
                <div className="mb-4">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Family Code</label>
                    <input 
                        type="text" 
                        value={familyCode}
                        onChange={(e) => setFamilyCode(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all uppercase tracking-widest font-mono"
                        placeholder="FAM-XXXXXX"
                        maxLength={10}
                        required
                    />
                </div>
                <button 
                    type="submit" 
                    disabled={loading || familyCode.length < 5}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold disabled:opacity-70 flex justify-center items-center"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        'Send Join Request'
                    )}
                </button>
            </form>
        </div>
    );
};

export default JoinFamilyGroup;
