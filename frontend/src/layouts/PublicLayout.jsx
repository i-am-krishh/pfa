import { Outlet, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'

/**
 * PublicLayout - Layout for public pages (Landing, Login, Register)
 * 
 * Features:
 * - No navbar on landing page
 * - Navbar visible on login/register pages
 * - Full-width content area
 * - Clean, minimal styling for public pages
 */

export default function PublicLayout() {
  const location = useLocation()
  
  // Show navbar only on login and register pages, not on landing
  const showNavbar = location.pathname !== '/' && location.pathname !== '/landing'

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar only on auth pages */}
      {showNavbar && <Navbar />}
      
      {/* Main Content */}
      <main className="w-full">
        <Outlet />
      </main>
    </div>
  )
}
