import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { TrendingUp, Menu, X } from 'lucide-react';

export default function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const token = localStorage.getItem('token');
    const user = token ? JSON.parse(localStorage.getItem('user') || '{}') : null;
    const [showMenu, setShowMenu] = useState(false);

    const isAuthenticated = !!token;
    const isLandingPage = location.pathname === '/';

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
        setShowMenu(false);
    };

    const isActive = (path) => location.pathname === path ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50';

    // Don't show navbar on login/register pages or landing page for unauthenticated users
    if (!isAuthenticated && (location.pathname === '/login' || location.pathname === '/register' || isLandingPage)) {
        return null;
    }

    // Authenticated navigation
    if (isAuthenticated && !isLandingPage) {
        return (
            <nav className="bg-white shadow-md border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                        <Link to="/dashboard" className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-slate-900 hidden sm:inline">FinancePro</span>
                        </Link>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center space-x-1">
                            <Link to="/dashboard" className={`px-4 py-2 rounded-lg transition ${isActive('/dashboard')}`}>
                                Dashboard
                            </Link>
                            <Link to="/income" className={`px-4 py-2 rounded-lg transition ${isActive('/income')}`}>
                                Income
                            </Link>
                            <Link to="/expenses" className={`px-4 py-2 rounded-lg transition ${isActive('/expenses')}`}>
                                Expenses
                            </Link>
                            <Link to="/savings" className={`px-4 py-2 rounded-lg transition ${isActive('/savings')}`}>
                                Savings
                            </Link>
                        </div>

                        {/* User Menu */}
                        <div className="hidden md:flex items-center space-x-4">
                            {user?.fullName && (
                                <div className="text-right">
                                    <p className="text-sm font-medium text-slate-900">{user.fullName}</p>
                                    <p className="text-xs text-slate-500">{user.email}</p>
                                </div>
                            )}
                            <button
                                onClick={handleLogout}
                                className="px-6 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition font-medium"
                            >
                                Logout
                            </button>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="md:hidden text-slate-600"
                        >
                            {showMenu ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>

                    {/* Mobile Menu */}
                    {showMenu && (
                        <div className="md:hidden pb-4 space-y-2 border-t border-slate-200 pt-4">
                            <Link
                                to="/dashboard"
                                className={`block px-4 py-2 rounded-lg transition ${isActive('/dashboard')}`}
                                onClick={() => setShowMenu(false)}
                            >
                                Dashboard
                            </Link>
                            <Link
                                to="/income"
                                className={`block px-4 py-2 rounded-lg transition ${isActive('/income')}`}
                                onClick={() => setShowMenu(false)}
                            >
                                Income
                            </Link>
                            <Link
                                to="/expenses"
                                className={`block px-4 py-2 rounded-lg transition ${isActive('/expenses')}`}
                                onClick={() => setShowMenu(false)}
                            >
                                Expenses
                            </Link>
                            <Link
                                to="/savings"
                                className={`block px-4 py-2 rounded-lg transition ${isActive('/savings')}`}
                                onClick={() => setShowMenu(false)}
                            >
                                Savings
                            </Link>
                            {user?.fullName && (
                                <div className="px-4 py-2 text-sm text-slate-600">
                                    <p className="font-medium">{user.fullName}</p>
                                    <p className="text-xs">{user.email}</p>
                                </div>
                            )}
                            <button
                                onClick={handleLogout}
                                className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium"
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </nav>
        );
    }

    return null;
}
