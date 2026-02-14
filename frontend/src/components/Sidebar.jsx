import { useNavigate, useLocation } from 'react-router-dom'
import { 
  Menu, X, LayoutDashboard, TrendingUp, ShoppingCart, 
  PiggyBank, LogOut, ChevronDown, TrendingUpIcon, 
  CreditCard, Calculator, Plus, Wallet
} from 'lucide-react'
import { useState, useEffect } from 'react'

/**
 * Sidebar Component
 * Updated with premium styling, section headers, active indicators, and tooltips.
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
  
  // State for dropdowns - using an object to track multiple potential dropdowns
  const [expandedMenus, setExpandedMenus] = useState({})

  // Navigation Data Structure
  const menuGroups = [
    {
      type: 'action',
    },
    {
      label: 'OVERVIEW',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      ]
    },
    {
      label: 'FINANCE',
      items: [
        {
          label: 'Portfolio',
          icon: Wallet,
          isDropdown: true,
          id: 'portfolio',
          children: [
            { label: 'Income', path: '/income', icon: TrendingUp },
            { label: 'Expenses', path: '/expenses', icon: ShoppingCart },
            { label: 'Savings', path: '/savings', icon: PiggyBank },
            { label: 'Investments', path: '/investments', icon: TrendingUpIcon },
            { label: 'Loans', path: '/loans', icon: CreditCard },
          ]
        }
      ]
    },
    {
      label: 'MARKET',
      items: [
        { label: 'Stock Market', path: '/stocks', icon: TrendingUp }
      ]
    },
    {
      label: 'TOOLS',
      items: [
        { label: 'Tax Saving', path: '/tax-saving', icon: Calculator },
      ]
    }
  ]

  // Auto-expand dropdowns based on active route
  useEffect(() => {
    const newExpanded = { ...expandedMenus }
    let changed = false

    menuGroups.forEach(group => {
      group.items?.forEach(item => {
        if (item.isDropdown && item.children) {
          const hasActiveChild = item.children.some(child => child.path === location.pathname)
          if (hasActiveChild && !newExpanded[item.id]) {
            newExpanded[item.id] = true
            changed = true
          }
        }
      })
    })

    if (changed) {
      setExpandedMenus(newExpanded)
    }
  }, [location.pathname])

  const handleNavigation = (path) => {
    navigate(path)
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }

  const toggleMenu = (id) => {
    setExpandedMenus(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  // Helper to check if a regular item is active
  const isItemActive = (path) => location.pathname === path

  return (
    <aside
      className={`
        fixed lg:fixed inset-y-0 left-0 z-40 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950
        transition-all duration-300 ease-out transform
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col shadow-2xl h-screen overflow-hidden border-r border-slate-800/50
        ${sidebarCollapsed ? 'lg:w-20' : 'w-72 lg:w-72'}
      `}
    >
      {/* Sidebar Header */}
      <div className={`flex items-center justify-between px-6 py-5 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm ${sidebarCollapsed ? 'lg:flex-col lg:px-3 lg:py-4 lg:gap-4' : ''}`}>
        <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'lg:flex-col lg:gap-2' : ''}`}>
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/20 ring-1 ring-white/10">
            <span className="text-white font-bold text-lg">FP</span>
          </div>
          <div className={`flex flex-col ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
            <h1 className="text-white font-bold text-base tracking-wide">FinancePro</h1>
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Dashboard</span>
          </div>
        </div>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={`hidden lg:flex items-center justify-center text-slate-400 hover:text-white transition-colors hover:bg-slate-800 p-1.5 rounded-lg ${sidebarCollapsed ? '' : ''}`}
        >
          {sidebarCollapsed ? (
            <div className="p-1"><Menu size={16} /></div>
          ) : (
             <div className="p-1 bg-slate-800 rounded-md"><Menu size={16} /></div>
          )}
        </button>

        {/* Mobile Close Button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden text-slate-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Navigation Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent hover:scrollbar-thumb-slate-700">
        <div className="px-4 py-6 space-y-6">
          
          {menuGroups.map((group, groupIndex) => {
            // Render Quick Action
            if (group.type === 'action') {
              return (
                <div key="action-btn" className="mb-6">
                  <button
                    onClick={() => console.log('Add Transaction')} // Placeholder action
                    className={`
                      w-full flex items-center gap-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500
                      text-white p-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all duration-300 group
                      ${sidebarCollapsed ? 'justify-center p-3' : 'px-4'}
                    `}
                    title="Add Transaction"
                  >
                    <Plus size={22} className="flex-shrink-0 transition-transform group-hover:rotate-90" />
                    <span className={`font-semibold tracking-wide ${sidebarCollapsed ? 'hidden' : 'block'}`}>
                      Add Transaction
                    </span>
                  </button>
                </div>
              )
            }

            return (
              <div key={groupIndex} className="space-y-2">
                {/* Section Header */}
                {group.label && !sidebarCollapsed && (
                  <div className="px-2 mb-2">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                      {group.label}
                    </p>
                  </div>
                )}
                
                {group.label && sidebarCollapsed && (
                   <div className="h-px bg-slate-800/50 mx-2 my-4" />
                )}

                {/* Items */}
                <div className="space-y-1">
                  {group.items.map((item, itemIndex) => {
                    if (item.isDropdown) {
                      const isOpen = expandedMenus[item.id]
                      const isActiveParent = item.children.some(c => c.path === location.pathname)
                      
                      return (
                        <div key={item.id} className="space-y-1">
                          {/* Dropdown Toggle */}
                          <div className="relative group">
                            <button
                              onClick={() => toggleMenu(item.id)}
                              className={`
                                w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200
                                ${isActiveParent || isOpen ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}
                                ${sidebarCollapsed ? 'justify-center' : ''}
                              `}
                            >
                              <div className="flex items-center gap-3">
                                <item.icon size={20} className={`${isActiveParent ? 'text-blue-400' : ''}`} />
                                <span className={`font-medium text-sm ${sidebarCollapsed ? 'hidden' : 'block'}`}>
                                  {item.label}
                                </span>
                              </div>
                              {!sidebarCollapsed && (
                                <ChevronDown
                                  size={16}
                                  className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-400' : 'text-slate-600'}`}
                                />
                              )}
                            </button>
                            
                            {/* Tooltip for Collapsed State */}
                            {sidebarCollapsed && (
                              <div className="absolute left-full top-2 ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl border border-slate-700">
                                {item.label}
                              </div>
                            )}
                          </div>

                          {/* Dropdown Content */}
                          {(!sidebarCollapsed && isOpen) && (
                            <div className="pl-4 space-y-0.5 mt-1 border-l border-slate-800 ml-3.5">
                              {item.children.map(child => {
                                const isChildActive = location.pathname === child.path
                                return (
                                  <button
                                    key={child.path}
                                    onClick={() => handleNavigation(child.path)}
                                    className={`
                                      w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 relative
                                      ${isChildActive 
                                        ? 'text-blue-400 bg-blue-500/10' 
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                                      }
                                    `}
                                  >
                                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${isChildActive ? 'bg-blue-400' : 'bg-slate-700'}`} />
                                    <span className="text-sm font-medium">{child.label}</span>
                                    
                                    {/* Active Glow Indicator (Right side or background) */}
                                    {isChildActive && (
                                       <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] rounded-r-full" />
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    } 
                    
                    // Simple Link Item
                    else {
                      const isActive = isItemActive(item.path)
                      return (
                        <div key={item.path} className="relative group">
                          <button
                            onClick={() => handleNavigation(item.path)}
                            className={`
                              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative overflow-hidden
                              ${isActive 
                                ? 'bg-gradient-to-r from-blue-600/10 to-transparent text-blue-400 font-semibold' 
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                              }
                              ${sidebarCollapsed ? 'justify-center' : ''}
                            `}
                          >
                            {/* Active Indicator Bar */}
                            {isActive && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[2px_0_12px_rgba(59,130,246,0.6)]" />
                            )}
                            
                            <item.icon size={20} className={`flex-shrink-0 relative z-10 ${isActive ? 'text-blue-400' : ''}`} />
                            <span className={`text-sm relative z-10 ${sidebarCollapsed ? 'hidden' : 'block'}`}>
                              {item.label}
                            </span>
                          </button>

                          {/* Tooltip for Collapsed */}
                          {sidebarCollapsed && (
                            <div className="absolute left-full top-2 ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl border border-slate-700">
                              {item.label}
                            </div>
                          )}
                        </div>
                      )
                    }
                  })}
                </div>
              </div>
            )
          })}
          
        </div>
      </div>

      {/* Footer / User Profile */}
      <div className="bg-slate-900/80 border-t border-slate-800/50 p-4">
        {/* Helper/Progress Widget */}
        {!sidebarCollapsed && (
          <div className="mb-6 px-1">
             <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monthly Budget</span>
                <span className="text-xs font-bold text-blue-400">85%</span>
             </div>
             <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 w-3/4 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.4)]" />
             </div>
          </div>
        )}

        <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'flex-col justify-center gap-4' : ''}`}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 ring-2 ring-slate-800 cursor-pointer hover:ring-slate-600 transition-all">
             <span className="text-white font-bold text-xs">{user?.fullName?.charAt(0) || 'U'}</span>
          </div>
          
          <div className={`flex-1 overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 hidden' : 'w-auto'}`}>
            <p className="text-sm font-bold text-white truncate">{user?.fullName}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>

          <button
            onClick={onLogout}
            className={`
              p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors
              ${sidebarCollapsed ? '' : 'hover:bg-red-500/10'}
            `}
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </aside>
  )
}
