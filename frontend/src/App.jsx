import { BrowserRouter } from 'react-router-dom'
import './App.css'
import AppRoutes from './AppRoutes'

/**
 * Main App Component
 * 
 * Provides:
 * - React Router context (BrowserRouter)
 * - All routes (public and protected)
 * - Layout wrappers (PublicLayout, DashboardLayout)
 * 
 * Route Structure:
 * ├── Public Routes (PublicLayout)
 * │   ├── / (Landing)
 * │   ├── /landing (Landing)
 * │   ├── /login (Login)
 * │   └── /register (Register)
 * └── Protected Routes (DashboardLayout)
 *     ├── /dashboard (Dashboard)
 *     ├── /income (Income)
 *     ├── /expenses (Expenses)
 *     └── /savings (Savings)
 */

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App