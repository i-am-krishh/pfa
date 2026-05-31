import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Menu, X, Moon, Sun } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Chatbot from '../components/Chatbot'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'

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
  }, [navigate])

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
              <button onClick={toggleTheme} className="p-2 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-slate-800 transition-colors">
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
              <div className="text-slate-600 dark:text-slate-400 text-sm hidden sm:block">
                Welcome back, <span className="font-semibold dark:text-slate-200">{user?.fullName?.split(' ')[0]}</span>
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
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 px-4 md:px-8 mt-12 transition-colors duration-300">
          <div className="max-w-full flex flex-col md:flex-row justify-between items-center text-slate-600 dark:text-slate-400 text-sm gap-4">
            <p>&copy; 2025 FinancePro. All rights reserved.</p>
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
