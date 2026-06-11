import { Routes, Route, Navigate } from 'react-router-dom'

// Pages
import Landing from './pages/Landing'
import Register from './pages/Register'
import Login from './pages/Login'
import VerifyOtp from './pages/VerifyOtp'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Profile from './pages/Profile'
import Dashboard from './pages/Dashboard'
import Expenses from './pages/Expenses'
import Income from './pages/Income'
import Savings from './pages/Savings'
import Investment from './pages/Investment'
import Loan from './pages/Loan'
import TaxSaving from './pages/TaxSaving'
import StockMarket from './pages/StockMarket'
import FamilyAccessPage from './pages/FamilyAccessPage'
import FamilyGoalPlanner from './pages/FamilyGoalPlanner'
import Watchlist from './pages/Watchlist'
import InvestmentAdvisor from './pages/InvestmentAdvisor'
import InvestmentAnalytics from './pages/InvestmentAnalytics'
import ImportStatement from './pages/ImportStatement'
import WelfareRecommender from './pages/WelfareRecommender'

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
        <Route path="/verify-otp" element={<PublicRoute element={<VerifyOtp />} />} />
        <Route path="/forgot-password" element={<PublicRoute element={<ForgotPassword />} />} />
        <Route path="/reset-password" element={<PublicRoute element={<ResetPassword />} />} />
      </Route>

      {/* Protected Routes - Wrapped in DashboardLayout */}
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
        <Route path="/income" element={<ProtectedRoute element={<Income />} />} />
        <Route path="/expenses" element={<ProtectedRoute element={<Expenses />} />} />
        <Route path="/savings" element={<ProtectedRoute element={<Savings />} />} />
        <Route path="/investments" element={<ProtectedRoute element={<Investment />} />} />
        <Route path="/investments/advisor" element={<ProtectedRoute element={<InvestmentAdvisor />} />} />
        <Route path="/investments/analytics" element={<ProtectedRoute element={<InvestmentAnalytics />} />} />
        <Route path="/watchlist" element={<ProtectedRoute element={<Watchlist />} />} />
        <Route path="/loans" element={<ProtectedRoute element={<Loan />} />} />
        <Route path="/tax-saving" element={<ProtectedRoute element={<TaxSaving />} />} />
        <Route path="/import-statement" element={<ProtectedRoute element={<ImportStatement />} />} />
        <Route path="/stocks" element={<ProtectedRoute element={<StockMarket />} />} />
        <Route path="/family" element={<ProtectedRoute element={<FamilyAccessPage />} />} />
        <Route path="/family/:familyId/goal-planner" element={<ProtectedRoute element={<FamilyGoalPlanner />} />} />
        <Route path="/family/:familyId/welfare" element={<ProtectedRoute element={<WelfareRecommender />} />} />
        <Route path="/profile" element={<ProtectedRoute element={<Profile />} />} />
      </Route>

      {/* Fallback Route */}
      <Route path="*" element={<Navigate to={token ? "/dashboard" : "/"} replace />} />
    </Routes>
  )
}
