import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { TrendingUp, KeyRound, Lock, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const email = searchParams.get('email') || '';

    // Step 1: Verify OTP, Step 2: Enter New Password
    const [step, setStep] = useState(1); 
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [passwords, setPasswords] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const otpInputRefs = useRef([]);

    useEffect(() => {
        if (!email) {
            setError('No email provided. Please request a new password reset code first.');
        }
    }, [email]);

    const handleOtpChange = (index, value) => {
        if (isNaN(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);

        if (value && index < 5) {
            otpInputRefs.current[index + 1].focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpInputRefs.current[index - 1].focus();
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').trim();
        if (pastedData.length !== 6 || isNaN(pastedData)) return;

        const newOtp = pastedData.split('');
        setOtp(newOtp);
        otpInputRefs.current[5].focus();
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        const otpCode = otp.join('');
        if (otpCode.length !== 6) {
            setError('Please enter all 6 digits');
            return;
        }

        setError('');
        setMessage('');
        setLoading(true);

        try {
            const response = await axios.post(`${API_URL}/auth/verify-reset-otp`, {
                email,
                otp: otpCode
            });
            
            setMessage(response.data.message || 'OTP verified successfully.');
            setTimeout(() => {
                setMessage('');
                setStep(2);
            }, 1000);
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed. Invalid or expired OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswords(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (passwords.newPassword.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        if (passwords.newPassword !== passwords.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        const otpCode = otp.join('');

        try {
            const response = await axios.post(`${API_URL}/auth/reset-password`, {
                email,
                otp: otpCode,
                newPassword: passwords.newPassword
            });

            setMessage(response.data.message || 'Password reset successful!');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const passwordMatch = passwords.newPassword && passwords.newPassword === passwords.confirmPassword;
    const passwordStrong = passwords.newPassword && passwords.newPassword.length >= 8;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center space-x-2 mb-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-2xl font-bold text-slate-900">FinancePro</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">Reset Password</h2>
                        <p className="text-slate-600 text-sm mt-2">
                            {step === 1 
                                ? `Enter the 6-digit code sent to ${email}`
                                : 'Set your new secure password'
                            }
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start space-x-3">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    {message && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-start space-x-3">
                            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" />
                            <span className="text-sm">{message}</span>
                        </div>
                    )}

                    {step === 1 ? (
                        /* Step 1: Verify OTP Form */
                        <form onSubmit={handleVerifyOtp} className="space-y-6">
                            <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        type="text"
                                        maxLength="1"
                                        value={digit}
                                        ref={(el) => (otpInputRefs.current[index] = el)}
                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                        className="w-12 h-14 text-center text-xl font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-slate-50 focus:bg-white"
                                    />
                                ))}
                            </div>

                            <button
                                type="submit"
                                disabled={loading || otp.some(d => d === '') || !email}
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2.5 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-md shadow-blue-500/10"
                            >
                                {loading ? 'Verifying...' : 'Verify Reset Code'}
                            </button>
                        </form>
                    ) : (
                        /* Step 2: New Password Form */
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 mb-2">New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                    <input
                                        type="password"
                                        name="newPassword"
                                        value={passwords.newPassword}
                                        onChange={handlePasswordChange}
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                        placeholder="••••••••"
                                    />
                                </div>
                                {passwords.newPassword && (
                                    <p className={`text-xs mt-1.5 flex items-center space-x-1 ${passwordStrong ? 'text-green-600' : 'text-amber-600'}`}>
                                        <span>{passwordStrong ? '✓ Strong password' : '⚠ Minimum 8 characters required'}</span>
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-900 mb-2">Confirm New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={passwords.confirmPassword}
                                        onChange={handlePasswordChange}
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                        placeholder="••••••••"
                                    />
                                </div>
                                {passwords.confirmPassword && (
                                    <p className={`text-xs mt-1.5 flex items-center space-x-1 ${passwordMatch ? 'text-green-600' : 'text-red-600'}`}>
                                        <span>{passwordMatch ? '✓ Passwords match' : '⚠ Passwords do not match'}</span>
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !passwordMatch || !passwordStrong}
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2.5 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-6 shadow-md shadow-blue-500/10"
                            >
                                {loading ? 'Saving Password...' : 'Save & Reset Password'}
                            </button>
                        </form>
                    )}

                    {/* Go back */}
                    <div className="mt-8 text-center">
                        <Link
                            to="/login"
                            className="text-slate-500 hover:text-slate-700 text-sm font-semibold inline-flex items-center gap-1.5 transition"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Sign In
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
