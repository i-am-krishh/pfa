import { Link } from 'react-router-dom';
import { TrendingUp, Shield, BarChart3, Zap, Users, Award } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header/Navigation for Landing */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">FinancePro</span>
          </div>
          <nav className="hidden md:flex space-x-8">
            <a href="#features" className="text-slate-600 hover:text-blue-600 transition">Features</a>
            <a href="#why-us" className="text-slate-600 hover:text-blue-600 transition">Why Us</a>
            <a href="#security" className="text-slate-600 hover:text-blue-600 transition">Security</a>
          </nav>
          <div className="flex items-center space-x-3">
            <Link
              to="/login"
              className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Hero Content */}
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
              Take Control of Your
              <span className="block bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Financial Future
              </span>
            </h1>
            
            <p className="text-lg text-slate-600 leading-relaxed">
              FinancePro is your all-in-one platform for managing income, expenses, savings, investments, loans, and insurance. Make smarter financial decisions with powerful analytics and insights.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                to="/register"
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition font-semibold text-center"
              >
                Get Started Free
              </Link>
              <button className="px-8 py-4 border-2 border-slate-300 text-slate-700 rounded-lg hover:border-blue-600 hover:text-blue-600 transition font-semibold">
                Watch Demo
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="pt-8 space-y-3">
              <div className="flex items-center space-x-2 text-slate-600">
                <Shield className="w-5 h-5 text-green-600" />
                <span>Bank-level security with encryption</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-600">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Trusted by 10,000+ users worldwide</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-600">
                <Award className="w-5 h-5 text-amber-600" />
                <span>4.9/5 rating from verified users</span>
              </div>
            </div>
          </div>

          {/* Hero Image/Illustration */}
          <div className="hidden md:block">
            <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl p-8 border border-blue-200">
              <div className="space-y-4">
                {/* Animated Dashboard Preview */}
                <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-semibold text-slate-700">Overview</span>
                    <span className="text-xs text-green-600 font-medium">↑ 12.5%</span>
                  </div>
                  <div className="space-y-3">
                    <div className="h-2 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full w-4/5"></div>
                    <div className="h-2 bg-gradient-to-r from-green-600 to-green-400 rounded-full w-3/5"></div>
                    <div className="h-2 bg-gradient-to-r from-amber-600 to-amber-400 rounded-full w-2/3"></div>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-600 mb-1">Total Income</p>
                    <p className="text-lg font-bold text-slate-900">$45,230</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-600 mb-1">Expenses</p>
                    <p className="text-lg font-bold text-slate-900">$12,890</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-600 mb-1">Savings</p>
                    <p className="text-lg font-bold text-slate-900">$28,450</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-600 mb-1">Investments</p>
                    <p className="text-lg font-bold text-slate-900">$15,680</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Powerful Features for Every Financial Goal
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Everything you need to take control of your finances in one comprehensive platform
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white rounded-xl p-8 border border-slate-200 hover:shadow-lg transition hover:border-blue-200">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Income Tracking</h3>
            <p className="text-slate-600">Track all income sources with detailed analytics and recurring income support.</p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-xl p-8 border border-slate-200 hover:shadow-lg transition hover:border-blue-200">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Expense Management</h3>
            <p className="text-slate-600">Categorize and analyze expenses to understand your spending patterns better.</p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-xl p-8 border border-slate-200 hover:shadow-lg transition hover:border-blue-200">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Smart Savings</h3>
            <p className="text-slate-600">Monitor savings accounts and track interest rates on your savings goals.</p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white rounded-xl p-8 border border-slate-200 hover:shadow-lg transition hover:border-blue-200">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Investments</h3>
            <p className="text-slate-600">Portfolio management with risk levels and returns tracking capabilities.</p>
          </div>

          {/* Feature 5 */}
          <div className="bg-white rounded-xl p-8 border border-slate-200 hover:shadow-lg transition hover:border-blue-200">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Loan Tracking</h3>
            <p className="text-slate-600">Monitor loans and EMIs with detailed payment schedules and reminders.</p>
          </div>

          {/* Feature 6 */}
          <div className="bg-white rounded-xl p-8 border border-slate-200 hover:shadow-lg transition hover:border-blue-200">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Insurance</h3>
            <p className="text-slate-600">Keep track of all insurance policies and premium due dates in one place.</p>
          </div>
        </div>
      </section>

      {/* Why Us Section */}
      <section id="why-us" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Why Choose FinancePro?
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            We're committed to helping you achieve your financial goals
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">✓</span>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">Simple & Intuitive</h3>
              <p className="text-slate-600">Easy to use interface that doesn't require any financial expertise</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">✓</span>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">Real-time Analytics</h3>
              <p className="text-slate-600">Get instant insights into your financial health with visual reports</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">✓</span>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">Mobile Responsive</h3>
              <p className="text-slate-600">Access your finances anytime, anywhere from any device</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">✓</span>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">Data Privacy</h3>
              <p className="text-slate-600">Your data is encrypted and never shared with third parties</p>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-slate-900 rounded-2xl p-12 text-white">
          <div className="max-w-3xl mx-auto text-center">
            <Shield className="w-16 h-16 mx-auto mb-6 text-blue-400" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Your Security is Our Priority
            </h2>
            <p className="text-slate-300 text-lg mb-8">
              We use industry-leading security measures to protect your financial data. Your trust is everything to us.
            </p>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="font-semibold mb-2">🔐 End-to-End Encryption</h3>
                <p className="text-slate-400 text-sm">All data is encrypted with military-grade encryption</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="font-semibold mb-2">✓ Verified Security</h3>
                <p className="text-slate-400 text-sm">Regular security audits and compliance certifications</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="font-semibold mb-2">🛡️ 24/7 Monitoring</h3>
                <p className="text-slate-400 text-sm">Continuous monitoring for suspicious activities</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-12 text-white text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Take Control of Your Finances?
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of users who are already managing their finances smarter with FinancePro
          </p>
          <Link
            to="/register"
            className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition font-semibold"
          >
            Start Your Free Account Today
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <span className="text-white font-bold">FinancePro</span>
              </div>
              <p className="text-sm">Your trusted financial management partner</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-blue-400 transition">Features</a></li>
                <li><a href="#security" className="hover:text-blue-400 transition">Security</a></li>
                <li><a href="#" className="hover:text-blue-400 transition">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-blue-400 transition">About</a></li>
                <li><a href="#" className="hover:text-blue-400 transition">Blog</a></li>
                <li><a href="#" className="hover:text-blue-400 transition">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-blue-400 transition">Privacy</a></li>
                <li><a href="#" className="hover:text-blue-400 transition">Terms</a></li>
                <li><a href="#" className="hover:text-blue-400 transition">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-sm">
            <p>&copy; 2025 FinancePro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
