import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    User, Mail, Phone, Calendar, Briefcase, IndianRupee, Shield, 
    Lock, Camera, ShieldCheck, ShieldAlert, CheckCircle, AlertCircle, Users, Eye
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function Profile() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Alert state
    const [alert, setAlert] = useState({ type: '', message: '' });

    // Forms
    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        dateOfBirth: '',
        occupation: '',
        monthlyIncomeRange: '',
        taxRegime: '',
        familyRole: '',
        riskAppetite: '',
        profileImage: ''
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordLoading, setPasswordLoading] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/auth/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                const userData = response.data.user;
                setUser(userData);
                
                // Format Date of Birth for input field (YYYY-MM-DD)
                let dobStr = '';
                if (userData.dateOfBirth) {
                    dobStr = new Date(userData.dateOfBirth).toISOString().split('T')[0];
                }

                setFormData({
                    fullName: userData.fullName || '',
                    phoneNumber: userData.phoneNumber || '',
                    dateOfBirth: dobStr,
                    occupation: userData.occupation || '',
                    monthlyIncomeRange: userData.monthlyIncomeRange || '',
                    taxRegime: userData.taxRegime || '',
                    familyRole: userData.familyRole || '',
                    riskAppetite: userData.riskAppetite || '',
                    profileImage: userData.profileImage || ''
                });

                // Update local storage just in case details updated
                localStorage.setItem('user', JSON.stringify({
                    id: userData._id,
                    fullName: userData.fullName,
                    email: userData.email,
                    phoneNumber: userData.phoneNumber,
                    currency: userData.currency,
                    twoFactorEnabled: userData.twoFactorEnabled,
                    profileImage: userData.profileImage
                }));
                window.dispatchEvent(new Event('userUpdated'));
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            showAlert('error', error.response?.data?.message || 'Failed to load profile details.');
        } finally {
            setLoading(false);
        }
    };

    const showAlert = (type, message) => {
        setAlert({ type, message });
        setTimeout(() => setAlert({ type: '', message: '' }), 5000);
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle profile image upload and convert to base64
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            showAlert('error', 'Profile photo must be less than 2MB.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({
                ...prev,
                profileImage: reader.result
            }));
        };
        reader.readAsDataURL(file);
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.put(`${API_URL}/auth/profile`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                showAlert('success', 'Profile updated successfully.');
                fetchProfile();
            }
        } catch (error) {
            showAlert('error', error.response?.data?.message || 'Failed to update profile.');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showAlert('error', 'New passwords do not match.');
            return;
        }

        setPasswordLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${API_URL}/auth/change-password`, {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                showAlert('success', 'Password updated successfully.');
                setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                });
            }
        } catch (error) {
            showAlert('error', error.response?.data?.message || 'Failed to change password.');
        } finally {
            setPasswordLoading(false);
        }
    };

    const handle2FAToggle = async () => {
        try {
            const token = localStorage.getItem('token');
            const targetState = !user?.twoFactorEnabled;
            
            const response = await axios.post(`${API_URL}/auth/2fa/toggle`, 
                { enabled: targetState },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                setUser(prev => ({
                    ...prev,
                    twoFactorEnabled: response.data.twoFactorEnabled
                }));
                try {
                    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
                    localUser.twoFactorEnabled = response.data.twoFactorEnabled;
                    localStorage.setItem('user', JSON.stringify(localUser));
                    window.dispatchEvent(new Event('userUpdated'));
                } catch (e) {
                    console.error('Error syncing 2FA state to local storage:', e);
                }
                showAlert('success', `Two-factor authentication ${response.data.twoFactorEnabled ? 'enabled' : 'disabled'}.`);
            }
        } catch (error) {
            showAlert('error', error.response?.data?.message || 'Failed to toggle Two-factor authentication.');
        }
    };

    const getPermissionsList = (role) => {
        switch (role) {
            case 'Admin':
                return [
                    'Full group administration and settings control',
                    'Invite and approve new family group members',
                    'Set spending limits and monthly budgets for members',
                    'View all shared dashboards (Income, Expenses, Investments, Loans)'
                ];
            case 'Co-Admin':
                return [
                    'Approve new member requests',
                    'Edit spending limits and monthly budgets',
                    'View all shared family dashboards'
                ];
            case 'Contributor':
                return [
                    'Add incomes, expenses, and investment transactions',
                    'Share financial data to family dashboard',
                    'View consolidated dashboards'
                ];
            case 'Expense Member':
                return [
                    'Request expense approvals',
                    'Record expenses within allowance limits',
                    'Viewer access to family summaries'
                ];
            case 'Viewer':
                return [
                    'Read-only view of family financial summaries',
                    'No transaction entry permissions'
                ];
            default:
                return ['Standard personal account dashboard access'];
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500 font-medium">Loading Profile Details...</p>
                </div>
            </div>
        );
    }

    const initials = user?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-16 px-1">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Profile Settings</h1>
                <p className="text-slate-500 mt-1">Manage your personal details, financial parameters, and security preferences.</p>
            </div>

            {/* Alert Notification */}
            {alert.message && (
                <div className={`p-4 rounded-xl border flex items-start space-x-3 transition-all animate-in fade-in slide-in-from-top-2 duration-300 ${
                    alert.type === 'success' 
                        ? 'bg-green-50 border-green-200 text-green-800' 
                        : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                    {alert.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 flex-shrink-0 text-green-600" />
                    ) : (
                        <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
                    )}
                    <span className="text-sm font-semibold">{alert.message}</span>
                </div>
            )}

            {/* Main Form */}
            <form onSubmit={handleProfileSubmit} className="space-y-8">
                {/* 1. PERSONAL INFORMATION */}
                <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <User className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">Personal Information</h2>
                    </div>

                    {/* Profile Photo Header */}
                    <div className="flex flex-col sm:flex-row items-center gap-6 pb-2">
                        <div className="relative group">
                            {formData.profileImage ? (
                                <img 
                                    src={formData.profileImage} 
                                    alt="Profile" 
                                    className="w-24 h-24 rounded-full object-cover border-2 border-slate-200"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center text-white text-3xl font-bold border-2 border-slate-200 shadow-inner">
                                    {initials}
                                </div>
                            )}
                            <label className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full cursor-pointer shadow-md transition transform hover:scale-105">
                                <Camera className="w-4 h-4" />
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleImageUpload} 
                                    className="hidden" 
                                />
                            </label>
                        </div>
                        <div className="text-center sm:text-left space-y-1">
                            <h3 className="font-semibold text-slate-900">Upload Profile Photo</h3>
                            <p className="text-xs text-slate-500">Supports JPG, PNG formats. Max file size: 2MB.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleFormChange}
                                    required
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-slate-900 bg-slate-50/50"
                                    placeholder="Enter your full name"
                                />
                            </div>
                        </div>

                        {/* Email (Read Only) */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-semibold text-slate-700">Email Address</label>
                                <span className="text-xs font-bold text-green-600 flex items-center gap-0.5">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Verified
                                </span>
                            </div>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                <input
                                    type="email"
                                    value={user?.email}
                                    readOnly
                                    disabled
                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed select-none"
                                />
                            </div>
                        </div>

                        {/* Phone Number */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Mobile Number</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                <input
                                    type="tel"
                                    name="phoneNumber"
                                    value={formData.phoneNumber}
                                    onChange={handleFormChange}
                                    maxLength="10"
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-slate-900 bg-slate-50/50"
                                    placeholder="10-digit mobile number"
                                />
                            </div>
                        </div>

                        {/* Date of Birth */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Date of Birth</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                <input
                                    type="date"
                                    name="dateOfBirth"
                                    value={formData.dateOfBirth}
                                    onChange={handleFormChange}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-slate-900 bg-slate-50/50"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. FINANCIAL INFORMATION */}
                <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                            <Briefcase className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">Financial Profile</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Occupation */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Occupation</label>
                            <div className="relative">
                                <Briefcase className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                <select
                                    name="occupation"
                                    value={formData.occupation}
                                    onChange={handleFormChange}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-slate-900 bg-slate-50/50 appearance-none"
                                >
                                    <option value="">Select Occupation</option>
                                    <option value="Student">Student</option>
                                    <option value="Salaried Employee">Salaried Employee</option>
                                    <option value="Self Employed">Self Employed</option>
                                    <option value="Business Owner">Business Owner</option>
                                    <option value="Freelancer">Freelancer</option>
                                    <option value="Retired">Retired</option>
                                </select>
                            </div>
                        </div>

                        {/* Monthly Income Range */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Monthly Income Range</label>
                            <div className="relative">
                                <IndianRupee className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                <select
                                    name="monthlyIncomeRange"
                                    value={formData.monthlyIncomeRange}
                                    onChange={handleFormChange}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-slate-900 bg-slate-50/50 appearance-none"
                                >
                                    <option value="">Select Range</option>
                                    <option value="Under ₹25,000">Under ₹25,000</option>
                                    <option value="₹25,000 - ₹50,000">₹25,000 - ₹50,000</option>
                                    <option value="₹50,000 - ₹1,00,000">₹50,000 - ₹1,00,000</option>
                                    <option value="₹1,00,000 - ₹2,50,000">₹1,00,000 - ₹2,50,000</option>
                                    <option value="Above ₹2,50,000">Above ₹2,50,000</option>
                                </select>
                            </div>
                        </div>

                        {/* Tax Regime */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Tax Regime</label>
                            <div className="relative">
                                <Shield className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                <select
                                    name="taxRegime"
                                    value={formData.taxRegime}
                                    onChange={handleFormChange}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-slate-900 bg-slate-50/50 appearance-none"
                                >
                                    <option value="">Select Tax Regime</option>
                                    <option value="New Regime">New Regime (default)</option>
                                    <option value="Old Regime">Old Regime</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. FAMILY INFORMATION */}
                <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
                        <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                            <Users className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">Family Group Details</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Family Role Options */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Family Role</label>
                            <div className="relative">
                                <Users className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                <select
                                    name="familyRole"
                                    value={formData.familyRole}
                                    onChange={handleFormChange}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-slate-900 bg-slate-50/50 appearance-none"
                                >
                                    <option value="">Set Family Role</option>
                                    <option value="Family Head">Family Head</option>
                                    <option value="Earning Member">Earning Member</option>
                                    <option value="Dependent">Dependent</option>
                                </select>
                            </div>
                        </div>

                        {/* Joined Family Info */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-center space-y-1">
                            {user?.familyGroup ? (
                                <>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Active Group</span>
                                        <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200 uppercase">
                                            {user.familyGroup.role}
                                        </span>
                                    </div>
                                    <p className="text-sm font-extrabold text-slate-800">{user.familyGroup.name}</p>
                                    <p className="text-xs text-slate-500 font-mono">Invite Code: {user.familyGroup.familyCode}</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm font-bold text-slate-800">Not in a Family Group</p>
                                    <p className="text-xs text-slate-500">Go to the Family module to create or join a shared budget group.</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Permissions list */}
                    {user?.familyGroup && (
                        <div className="p-4 bg-purple-50/30 border border-purple-100 rounded-xl space-y-3">
                            <h3 className="text-xs font-bold text-purple-900 flex items-center gap-1.5 uppercase tracking-wide">
                                <Eye className="w-3.5 h-3.5" />
                                Current Role Permissions ({user.familyGroup.role})
                            </h3>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600 pl-4 list-disc">
                                {getPermissionsList(user.familyGroup.role).map((perm, i) => (
                                    <li key={i}>{perm}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* 4. FINANCIAL PREFERENCES */}
                <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
                        <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                            <IndianRupee className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">Investment Preferences</h2>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Risk Appetite</label>
                        <div className="relative">
                            <select
                                name="riskAppetite"
                                value={formData.riskAppetite}
                                onChange={handleFormChange}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-slate-900 bg-slate-50/50 appearance-none"
                            >
                                <option value="">Select Risk Appetite</option>
                                <option value="Low Risk">Low Risk (Capital Preservation)</option>
                                <option value="Medium Risk">Medium Risk (Balanced Growth)</option>
                                <option value="High Risk">High Risk (Aggressive Appreciation)</option>
                            </select>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            This selection will be used to calibrate your automated AI recommendations and financial guidance.
                        </p>
                    </div>
                </div>

                {/* Save Profile Button */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-6 py-2.5 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/10"
                    >
                        {submitting ? 'Saving Changes...' : 'Save Profile Details'}
                    </button>
                </div>
            </form>

            {/* 5. SECURITY SETTINGS */}
            <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
                    <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
                        <Lock className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-800">Security & Authentication</h2>
                </div>

                {/* OTP Toggler / 2FA */}
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="space-y-1">
                        <h3 className="text-sm font-extrabold text-slate-800">Two-Factor Authentication (OTP Login)</h3>
                        <p className="text-xs text-slate-500">Require a 6-digit email verification code every time you sign in.</p>
                    </div>
                    <button
                        onClick={handle2FAToggle}
                        className={`w-12 h-6 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-300 focus:outline-none ${
                            user?.twoFactorEnabled ? 'bg-emerald-600' : 'bg-slate-700'
                        }`}
                    >
                        <div
                            className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${
                                user?.twoFactorEnabled ? 'translate-x-6' : 'translate-x-0'
                            }`}
                        />
                    </button>
                </div>

                {/* Change Password Form */}
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <h3 className="text-sm font-extrabold text-slate-800">Change Password</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Current Password */}
                        <div>
                            <input
                                type="password"
                                name="currentPassword"
                                value={passwordData.currentPassword}
                                onChange={handlePasswordChange}
                                required
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm text-slate-900 bg-slate-50/50"
                                placeholder="Current Password"
                            />
                        </div>

                        {/* New Password */}
                        <div>
                            <input
                                type="password"
                                name="newPassword"
                                value={passwordData.newPassword}
                                onChange={handlePasswordChange}
                                required
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm text-slate-900 bg-slate-50/50"
                                placeholder="New Password"
                            />
                        </div>

                        {/* Confirm Password */}
                        <div className="flex gap-2">
                            <input
                                type="password"
                                name="confirmPassword"
                                value={passwordData.confirmPassword}
                                onChange={handlePasswordChange}
                                required
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm text-slate-900 bg-slate-50/50"
                                placeholder="Confirm New Password"
                            />
                            <button
                                type="submit"
                                disabled={passwordLoading || !passwordData.currentPassword || !passwordData.newPassword}
                                className="bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                                {passwordLoading ? 'Saving...' : 'Update'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
