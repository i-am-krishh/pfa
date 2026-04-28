import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Shield, Check, X, Info, Wallet, ShoppingBag, TrendingUp, Landmark } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function FamilySharingSettings({ familyId: propFamilyId }) {
    const { familyId: paramFamilyId } = useParams();
    const familyId = propFamilyId || paramFamilyId;
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [family, setFamily] = useState(null);
    const [settings, setSettings] = useState({
        shareIncome: false,
        shareExpenses: true,
        shareInvestments: false,
        shareLoans: false
    });
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchSettings();
    }, [familyId]);

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            // We can get settings from the dashboard data or a specific members call
            const response = await axios.get(`${API_URL}/family/dashboard/${familyId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const myData = response.data.data.myMemberData;
            setSettings({
                shareIncome: myData.shareIncome,
                shareExpenses: myData.shareExpenses,
                shareInvestments: myData.shareInvestments,
                shareLoans: myData.shareLoans
            });
            // We also need the family name
            // Fetching from my-families to find the name
            const familiesRes = await axios.get(`${API_URL}/family/my-families`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const currentFamily = familiesRes.data.data.find(f => f._id === familyId);
            setFamily(currentFamily);
        } catch (error) {
            console.error('Error fetching sharing settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (setting) => {
        setSettings(prev => ({ ...prev, [setting]: !prev[setting] }));
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${API_URL}/family/sharing-settings/${familyId}`, settings, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessage('Settings saved successfully!');
            setTimeout(() => navigate(`/family-dashboard/${familyId}`), 1500);
        } catch (error) {
            console.error('Error saving sharing settings:', error);
            setMessage('Error saving settings. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-8 py-10 text-white">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                            <Shield size={32} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Privacy & Sharing Settings</h1>
                            <p className="text-indigo-100 opacity-90">{family?.name || 'Family Group'}</p>
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-start gap-4">
                        <Info className="text-blue-600 shrink-0 mt-0.5" size={20} />
                        <div className="text-sm text-blue-800">
                            <p className="font-semibold mb-1">How sharing works:</p>
                            <p>Enabling a category allows the Family Dashboard to include your <strong>shared personal records</strong> in the group totals. Direct family transactions are always shared.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <SharingToggle 
                            icon={<Wallet className="text-emerald-600" />}
                            title="Personal Income"
                            description="Share personal income records marked for family sync"
                            enabled={settings.shareIncome}
                            onToggle={() => handleToggle('shareIncome')}
                        />
                        <SharingToggle 
                            icon={<ShoppingBag className="text-rose-600" />}
                            title="Personal Expenses"
                            description="Share personal expense records marked for family sync"
                            enabled={settings.shareExpenses}
                            onToggle={() => handleToggle('shareExpenses')}
                        />
                        <SharingToggle 
                            icon={<TrendingUp className="text-indigo-600" />}
                            title="Investments"
                            description="Share your investment portfolio summary with the family"
                            enabled={settings.shareInvestments}
                            onToggle={() => handleToggle('shareInvestments')}
                        />
                        <SharingToggle 
                            icon={<Landmark className="text-amber-600" />}
                            title="Loans"
                            description="Share loan progress and EMI details with the family"
                            enabled={settings.shareLoans}
                            onToggle={() => handleToggle('shareLoans')}
                        />
                    </div>

                    {message && (
                        <div className={`p-4 rounded-xl text-center font-medium ${message.includes('Error') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                            {message}
                        </div>
                    )}

                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={() => navigate(`/family-dashboard/${familyId}`)}
                            className="flex-1 px-6 py-3.5 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {saving ? 'Saving...' : (
                                <>
                                    <Check size={20} />
                                    Save Settings
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SharingToggle({ icon, title, description, enabled, onToggle }) {
    return (
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all group">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {icon}
                </div>
                <div>
                    <h3 className="font-bold text-slate-800">{title}</h3>
                    <p className="text-xs text-slate-500">{description}</p>
                </div>
            </div>
            <button
                onClick={onToggle}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
            >
                <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
                />
            </button>
        </div>
    );
}
