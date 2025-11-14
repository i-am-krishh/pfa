import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, X, LayoutDashboard, TrendingUp, ShoppingCart, PiggyBank, LogOut, ChevronDown, TrendingUpIcon, CreditCard, Calculator } from 'lucide-react'
import { useState } from 'react'

/**
 * Sidebar Component - Collapsible navigation sidebar
 * 
 * Props:
 * - sidebarOpen: boolean - Controls mobile sidebar visibility
 * - setSidebarOpen: function - Updates sidebarOpen state
 * - sidebarCollapsed: boolean - Controls desktop sidebar collapse
 * - setSidebarCollapsed: function - Updates sidebarCollapsed state
 * - user: object - Current user data (name, email)
 * - onLogout: function - Logout handler
 */

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  sidebarCollapsed,
  setSidebarCollapsed,
  user,
  onLogout,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Navigation items with icons
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Income', path: '/income', icon: TrendingUp },
    { label: 'Expenses', path: '/expenses', icon: ShoppingCart },
    { label: 'Savings', path: '/savings', icon: PiggyBank },
    { label: 'Investments', path: '/investments', icon: TrendingUpIcon },
    { label: 'Loans', path: '/loans', icon: CreditCard },
  ]

  const handleNavigation = (path) => {
    navigate(path)
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }

  return (
    <aside
      className={`
        fixed lg:fixed inset-y-0 left-0 z-40 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950
        transition-all duration-300 ease-out transform
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col shadow-2xl h-screen overflow-hidden
        ${sidebarCollapsed ? 'lg:w-20' : 'w-64 lg:w-64'}
      `}
    >
      {/* Sidebar Header */}
      <div className={`flex items-center justify-between px-6 py-5 border-b border-slate-700/50 bg-gradient-to-r from-slate-900 to-slate-800/50 ${sidebarCollapsed ? 'lg:flex-col lg:px-3 lg:py-4' : ''}`}>
        <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'lg:flex-col lg:gap-2' : ''}`}>
          <div className="w-11 h-11 bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/30">
            <span className="text-white font-bold text-lg">FP</span>
          </div>
          <div className={`${sidebarCollapsed ? 'lg:hidden' : ''}`}>
            <h1 className="text-white font-bold text-base leading-tight">FinancePro</h1>
            <p className="text-slate-400 text-xs leading-none mt-0.5">Pro Finance</p>
          </div>
        </div>

        {/* Collapse/Expand button - visible on desktop only */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={`hidden lg:flex items-center justify-center text-slate-400 hover:text-blue-400 transition-colors duration-200 hover:bg-slate-800/50 p-1.5 rounded-lg ${sidebarCollapsed ? 'lg:order-first' : ''}`}
        >
          {sidebarCollapsed ? '→' : '←'}
        </button>

        {/* Close button for mobile */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden text-slate-400 hover:text-white transition-colors hover:bg-slate-800/50 p-1.5 rounded-lg"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation Items - Scrollable */}
      <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700/50 scrollbar-track-transparent hover:scrollbar-thumb-slate-600">
        {/* Budget Tracker Dropdown */}
        <div>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`
              w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200
              ${sidebarCollapsed ? 'lg:justify-center lg:px-3' : ''}
              ${dropdownOpen
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/30 font-semibold'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white font-medium'
              }
            `}
            title={sidebarCollapsed ? 'Budget Tracker' : ''}
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard size={20} className="flex-shrink-0" />
              <span className={`${sidebarCollapsed ? 'lg:hidden' : ''}`}>Budget Tracker</span>
            </div>
            <ChevronDown
              size={18}
              className={`flex-shrink-0 transition-transform duration-300 ${sidebarCollapsed ? 'lg:hidden' : ''} ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className={`mt-1 space-y-1 pl-4 border-l-2 border-blue-600/30 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      handleNavigation(item.path)
                      setDropdownOpen(false)
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200
                      ${isActive
                        ? 'bg-blue-600/20 text-blue-400 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/40 hover:text-white'
                      }
                    `}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Tax Saving Navigation Item */}
        <button
          onClick={() => {
            handleNavigation('/tax-saving')
            setDropdownOpen(false)
          }}
          className={`
            w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
            ${location.pathname === '/tax-saving'
              ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg shadow-green-600/30 font-semibold'
              : 'text-slate-300 hover:bg-slate-800/60 hover:text-white font-medium'
            }
          `}
          title="Tax Saving Optimizer"
        >
          <Calculator size={20} className="flex-shrink-0" />
          <span>Tax Saving</span>
        </button>
      </nav>

      {/* User Section - Fixed at bottom */}
      <div className={`border-t border-slate-700/50 p-4 space-y-3 mt-auto bg-gradient-to-r from-slate-900/50 to-slate-800/50 ${sidebarCollapsed ? 'lg:p-3 lg:space-y-2' : ''}`}>
        <div className={`px-4 py-2 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
          <p className="text-slate-500 text-xs uppercase tracking-wider font-bold">Account</p>
          <p className="text-white text-sm font-bold mt-2 truncate leading-tight">{user?.fullName}</p>
          <p className="text-slate-400 text-xs truncate mt-0.5">{user?.email}</p>
        </div>
        <button
          onClick={onLogout}
          title="Logout"
          className={`
            w-full flex items-center gap-2 px-4 py-3 rounded-xl transition-all duration-200 font-semibold
            text-slate-300 hover:bg-red-600/20 hover:text-red-400 hover:border hover:border-red-600/30
            ${sidebarCollapsed ? 'lg:justify-center lg:px-3 lg:py-2.5' : 'border border-transparent'}
          `}
        >
          <LogOut size={18} className="flex-shrink-0" />
          <span className={`${sidebarCollapsed ? 'lg:hidden' : ''}`}>Logout</span>
        </button>
      </div>
    </aside>
  )
}
