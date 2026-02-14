import { Routes, Route, Navigate } from 'react-router-dom'

// Pages
import Landing from './pages/Landing'
import Register from './pages/Register'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Expenses from './pages/Expenses'
import Income from './pages/Income'
import Savings from './pages/Savings'
import Investment from './pages/Investment'
import Loan from './pages/Loan'
import TaxSaving from './pages/TaxSaving'
import StockMarket from './pages/StockMarket'

// Layouts
import PublicLayout from './layouts/PublicLayout'
import DashboardLayout from './layouts/DashboardLayout'

// Protected Route Component
export function ProtectedRoute({ element }) {
  const token = localStorage.getItem('token')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return element
}

// Public Route Component (Redirects authenticated users to dashboard)
export function PublicRoute({ element }) {
  const token = localStorage.getItem('token')
  if (token) {
    return <Navigate to="/dashboard" replace />
  }
  return element
}

export default function AppRoutes() {
  const token = localStorage.getItem('token')

  return (
    <Routes>
      {/* Public Routes - Wrapped in PublicLayout */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<PublicRoute element={<Landing />} />} />
        <Route path="/landing" element={<PublicRoute element={<Landing />} />} />
        <Route path="/login" element={<PublicRoute element={<Login />} />} />
        <Route path="/register" element={<PublicRoute element={<Register />} />} />
      </Route>

      {/* Protected Routes - Wrapped in DashboardLayout */}
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
        <Route path="/income" element={<ProtectedRoute element={<Income />} />} />
        <Route path="/expenses" element={<ProtectedRoute element={<Expenses />} />} />
        <Route path="/savings" element={<ProtectedRoute element={<Savings />} />} />
        <Route path="/investments" element={<ProtectedRoute element={<Investment />} />} />
        <Route path="/loans" element={<ProtectedRoute element={<Loan />} />} />
        <Route path="/tax-saving" element={<ProtectedRoute element={<TaxSaving />} />} />
        <Route path="/stocks" element={<ProtectedRoute element={<StockMarket />} />} />
      </Route>

      {/* Fallback Route */}
      <Route path="*" element={<Navigate to={token ? "/dashboard" : "/"} replace />} />
    </Routes>
  )
}
