import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { TrendingUp, ShieldCheck, ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function VerifyOtp() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const email = searchParams.get('email') || '';
    const type = searchParams.get('type') || 'register'; // 'register' or '2fa'

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendCountdown, setResendCountdown] = useState(30); // 30s countdown
    const [resending, setResending] = useState(false);
    
    const inputRefs = useRef([]);

    useEffect(() => {
        if (!email) {
            setError('No email provided for verification. Please register or sign in again.');
        }
    }, [email]);

    // Countdown timer for resend
    useEffect(() => {
        if (resendCountdown > 0) {
            const timer = setTimeout(() => setResendCountdown(prev => prev - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCountdown]);

    const handleChange = (index, value) => {
        // Only allow numbers
        if (isNaN(value)) return;

        const newOtp = [...otp];
        // Take only the last character entered
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);

        // Auto focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (index, e) => {
        // Handle backspace
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').trim();
        if (pastedData.length !== 6 || isNaN(pastedData)) return;

        const newOtp = pastedData.split('');
        setOtp(newOtp);
        inputRefs.current[5].focus();
    };

    const handleSubmit = async (e) => {
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
            const response = await axios.post(`${API_URL}/auth/verify-otp`, {
                email,
                otp: otpCode
            });

            setMessage(response.data.message || 'Verification successful!');
            
            // Set token and user info, then redirect to dashboard
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));

            setTimeout(() => {
                navigate('/dashboard');
            }, 1000);
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendCountdown > 0 || resending) return;

        setError('');
        setMessage('');
        setResending(true);

        try {
            const response = await axios.post(`${API_URL}/auth/resend-otp`, { email });
            setMessage(response.data.message || 'A new verification code has been sent.');
            setResendCountdown(60); // Set to 60s for next resend
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0].focus();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to resend code');
        } finally {
            setResending(false);
        }
    };

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
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">
                            {type === '2fa' ? 'Two-Factor Authentication' : 'Verify Your Email'}
                        </h2>
                        <p className="text-slate-600 text-sm mt-2">
                            We have sent a 6-digit verification code to <br />
                            <strong className="text-slate-950 font-semibold">{email || 'your email'}</strong>
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
                            <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" />
                            <span className="text-sm">{message}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* OTP Input Fields */}
                        <div className="flex justify-between gap-2" onPaste={handlePaste}>
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    type="text"
                                    maxLength="1"
                                    value={digit}
                                    ref={(el) => (inputRefs.current[index] = el)}
                                    onChange={(e) => handleChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    className="w-12 h-14 text-center text-xl font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-slate-50 focus:bg-white"
                                />
                            ))}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || otp.some(d => d === '')}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2.5 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-md shadow-blue-500/10"
                        >
                            {loading ? 'Verifying...' : 'Verify Code'}
                        </button>
                    </form>

                    {/* Resend Action */}
                    <div className="mt-8 text-center text-sm text-slate-600">
                        Didn't receive the code?{' '}
                        {resendCountdown > 0 ? (
                            <span className="text-slate-400 font-medium">
                                Resend in {resendCountdown}s
                            </span>
                        ) : (
                            <button
                                onClick={handleResend}
                                disabled={resending}
                                className="text-blue-600 hover:text-blue-700 font-semibold transition inline-flex items-center gap-1 focus:outline-none disabled:opacity-50"
                            >
                                {resending && <RefreshCw className="w-3 h-3 animate-spin" />}
                                Resend Code
                            </button>
                        )}
                    </div>

                    {/* Go back */}
                    <div className="mt-6 text-center">
                        <Link
                            to="/login"
                            className="text-slate-500 hover:text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Back to Sign In
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
