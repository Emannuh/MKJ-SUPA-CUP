import { Outlet, Link, NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Layout() {
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-blue-700">MKJ SUPA CUP</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <NavLink
                to="/fixtures"
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${isActive ? 'text-blue-700' : 'text-gray-600 hover:text-gray-900'}`
                }
              >
                Fixtures
              </NavLink>
              <NavLink
                to="/standings"
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${isActive ? 'text-blue-700' : 'text-gray-600 hover:text-gray-900'}`
                }
              >
                Standings
              </NavLink>
              <NavLink
                to="/results"
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${isActive ? 'text-blue-700' : 'text-gray-600 hover:text-gray-900'}`
                }
              >
                Results
              </NavLink>
            </nav>

            {/* Auth buttons */}
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <div className="flex items-center gap-4">
                  <Link
                    to="/portal"
                    className="text-sm font-medium text-gray-600 hover:text-gray-900"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={logout}
                    className="text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white font-bold mb-3">MKJ SUPA CUP</h3>
              <p className="text-sm">
                Governor Mutula Kilonzo Junior Supa Cup — Makueni County's premier youth sports championship.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Sports</h4>
              <ul className="space-y-2 text-sm">
                <li>Football</li>
                <li>Volleyball</li>
                <li>Basketball</li>
                <li>Handball</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/fixtures" className="hover:text-white transition-colors">Fixtures</Link></li>
                <li><Link to="/standings" className="hover:text-white transition-colors">Standings</Link></li>
                <li><Link to="/results" className="hover:text-white transition-colors">Results</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Contact</h4>
              <p className="text-sm">County Government of Makueni</p>
              <p className="text-sm">P.O BOX 78-90300, Wote</p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} MKJ SUPA CUP. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
