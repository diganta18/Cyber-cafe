import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Monitor, Users, Clock, Receipt, Package,
  BarChart2, UserCog, LayoutDashboard, Menu, X, LogOut, Wifi
} from 'lucide-react'

const allNavLinks = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard',        roles: ['admin','staff'] },
  { to: '/stations',  icon: Monitor,         label: 'Stations',         roles: ['admin','staff'] },
  { to: '/sessions',  icon: Clock,           label: 'Active Sessions',  roles: ['admin','staff'] },
  { to: '/customers', icon: Users,           label: 'Customers',        roles: ['admin','staff'] },
  { to: '/bills',     icon: Receipt,         label: 'Bills',            roles: ['admin','staff'] },
  { to: '/services',  icon: Package,         label: 'Services & Stock', roles: ['admin'] },
  { to: '/reports',   icon: BarChart2,       label: 'Reports',          roles: ['admin'] },
  { to: '/staff',     icon: UserCog,         label: 'Staff',            roles: ['admin'] },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const visibleLinks = allNavLinks.filter(link => link.roles.includes(user?.role))

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const Sidebar = ({ mobile = false }) => (
    <div className={`flex flex-col h-full bg-gray-950 ${mobile ? '' : 'w-56'}`}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-800">
        <div className="bg-primary-600 rounded-lg p-1.5">
          <Wifi className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">CyberCafe</p>
          <p className="text-gray-500 text-xs">Manager</p>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        <div className="space-y-0.5">
          {visibleLinks.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User info */}
      <div className="px-3 py-3 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.name}</p>
            <p className="text-gray-500 text-xs capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md text-sm transition-colors duration-150"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-56 z-30">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex flex-col w-56 bg-gray-950 z-50">
            <div className="absolute top-3 right-3">
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white p-1" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 sticky top-0 z-20 no-print">
          <button
            className="md:hidden btn-ghost p-2"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              Welcome, <span className="font-semibold text-gray-800">{user?.name}</span>
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
