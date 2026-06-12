import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Menu, X, Bell, Check, CreditCard } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'
import Sidebar from '../components/Sidebar'
import Chatbot from '../components/Chatbot'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * DashboardLayout - Modern layout with collapsible sidebar
 * 
 * Features:
 * - Collapsible sidebar (toggleable on all screen sizes)
 * - Mobile-friendly with hamburger menu
 * - Dynamic navigation items
 * - Smooth transitions and animations
 * - Auth check on mount
 * - Clean, modern design
 */

export default function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [user, setUser] = useState(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const response = await axios.get(`${API_URL}/notification`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.data.success) {
        setNotifications(response.data.notifications || [])
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const handleMarkAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token')
      await axios.put(`${API_URL}/notification/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchNotifications()
    } catch (error) {
      console.error('Error marking read:', error)
    }
  }

  const handlePayEmi = async (id) => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(`${API_URL}/notification/${id}/pay`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.data.success) {
        alert('EMI payment recorded successfully! Expense added.')
        fetchNotifications()
        window.dispatchEvent(new Event('emiPaid'))
      }
    } catch (error) {
      console.error('Error paying EMI:', error)
      alert(error.response?.data?.message || 'Error recording payment')
    }
  }

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await axios.get(`${API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        const userData = response.data.user;
        const userStorageObj = {
          id: userData._id,
          fullName: userData.fullName,
          email: userData.email,
          phoneNumber: userData.phoneNumber,
          currency: userData.currency,
          twoFactorEnabled: userData.twoFactorEnabled,
          profileImage: userData.profileImage
        };
        localStorage.setItem('user', JSON.stringify(userStorageObj));
        setUser(userStorageObj);
      }
    } catch (err) {
      console.error('Error syncing user profile in layout:', err);
    }
  };

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    
    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    setUser(userData ? JSON.parse(userData) : null)
    setIsLoading(false)

    // Initial fetch
    fetchNotifications()
    fetchUserProfile()

    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [navigate])

  // Listen for user profile updates
  useEffect(() => {
    const handleUserUpdate = () => {
      const userData = localStorage.getItem('user')
      setUser(userData ? JSON.parse(userData) : null)
    }
    window.addEventListener('userUpdated', handleUserUpdate)
    return () => window.removeEventListener('userUpdated', handleUserUpdate)
  }, [])

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }, [location])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  // Navigation items for reference (topbar uses this)
  const navItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Income', path: '/income' },
    { label: 'Expenses', path: '/expenses' },
    { label: 'Savings', path: '/savings' },
    { label: 'Investments', path: '/investments' },
    { label: 'Loans', path: '/loans' },
    { label: 'Tax Saving', path: '/tax-saving' },
    { label: 'Import Statement', path: '/import-statement' },
  ]



  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 transition-colors duration-300">
      {/* Sidebar Component - Fixed */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Content - With left margin to account for fixed sidebar */}
      <main className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'}`}>
        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
          <div className="flex items-center justify-between px-4 md:px-8 py-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex lg:hidden items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <div className="flex-1 flex justify-center lg:justify-start">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {navItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              {/* Notification Bell Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors focus:outline-none"
                  title="Notifications"
                >
                  <Bell size={22} />
                  {notifications.filter(n => !n.isRead).length > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {notifications.filter(n => !n.isRead).length}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-3 duration-200">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <h3 className="font-bold text-slate-800">Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                          <Bell className="mx-auto mb-2 text-slate-300" size={32} />
                          <p className="text-sm">No notifications</p>
                        </div>
                      ) : (
                        notifications.map(notif => (
                          <div key={notif._id} className={`p-4 hover:bg-slate-50 transition-colors ${!notif.isRead ? 'bg-blue-50/30' : ''}`}>
                            <div className="flex gap-3">
                              <div className="mt-0.5 p-1.5 bg-red-100/50 rounded-lg text-red-600 self-start">
                                <CreditCard size={16} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                  <h4 className={`text-sm font-semibold text-slate-800 truncate ${!notif.isRead ? 'font-bold' : ''}`}>
                                    {notif.title}
                                  </h4>
                                  <span className="text-[10px] text-slate-400 whitespace-nowrap mt-0.5">
                                    {new Date(notif.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 mt-1 break-words">{notif.message}</p>
                                
                                {notif.type === 'loan_emi' && (
                                  <div className="mt-3 flex gap-2">
                                    {notif.actionStatus === 'pending' ? (
                                      <>
                                        <button 
                                          onClick={() => handlePayEmi(notif._id)}
                                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                                        >
                                          Mark Paid
                                        </button>
                                        {!notif.isRead && (
                                          <button 
                                            onClick={() => handleMarkAsRead(notif._id)}
                                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                                          >
                                            Dismiss
                                          </button>
                                        )}
                                      </>
                                    ) : (
                                      <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-lg border border-green-100">
                                        <Check size={12} /> Paid
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-slate-600 text-sm hidden sm:block">
                Welcome back, <span className="font-semibold">{user?.fullName?.split(' ')[0]}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="min-h-[calc(100vh-80px)] p-4 md:p-8 lg:p-10 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-8 px-4 md:px-8 mt-12">
          <div className="max-w-full flex flex-col md:flex-row justify-between items-center text-slate-600 text-sm gap-4">
            <p>&copy; 2026 FinancePro. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Privacy</a>
              <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Terms</a>
              <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Help</a>
            </div>
          </div>
        </footer>
      </main>

      {/* Mobile Overlay */}
      { sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/20 lg:hidden backdrop-blur-sm"
        />
      )}
      
      {/* Floating Chatbot */}
      <Chatbot />
    </div>
  )
}
