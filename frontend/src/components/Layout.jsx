import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Monitor, Users, Clock, Receipt, Package,
  BarChart2, UserCog, LayoutDashboard, Menu, X, LogOut, Zap
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

function SidebarContent({ visibleLinks, user, handleLogout, onNav }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-line">
        <div className="relative flex-shrink-0">
          <div className="h-9 w-9 rounded-xl bg-accent flex items-center justify-center shadow-card">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-sidebar animate-pulse-glow" />
        </div>
        <div>
          <p className="text-ink font-bold text-sm leading-tight">CyberCafe</p>
          <p className="text-accent text-xs font-medium tracking-wide">Manager Pro</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        <p className="text-[10px] font-bold text-ink-faint uppercase tracking-widest px-3 mb-2">Navigation</p>
        {visibleLinks.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNav}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-accent/10 text-accent border border-accent/20'
                  : 'text-ink-faint hover:text-ink hover:bg-surface-raised'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`h-4 w-4 flex-shrink-0 transition-colors ${isActive ? 'text-accent' : 'text-ink-faint group-hover:text-ink-muted'}`} />
                <span className="truncate">{label}</span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent flex-shrink-0" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="px-3 pb-4 pt-3 border-t border-line">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-raised border border-line mb-2">
          <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-card">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-ink text-xs font-semibold truncate">{user?.name}</p>
            <p className="text-ink-faint text-xs capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 text-ink-faint hover:text-danger hover:bg-danger/10 rounded-lg text-sm font-medium transition-all duration-150"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  )
}

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const visibleLinks = allNavLinks.filter(link => link.roles.includes(user?.role))

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const currentLink = allNavLinks.find(l => l.to === location.pathname) || allNavLinks[0]

  return (
    <div className="min-h-screen flex bg-bg">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-60 z-30 bg-sidebar border-r border-line">
        <SidebarContent
          visibleLinks={visibleLinks}
          user={user}
          handleLogout={handleLogout}
          onNav={() => {}}
        />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative flex flex-col w-64 bg-sidebar border-r border-line z-50 animate-slide-in">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-3 text-ink-faint hover:text-ink p-1.5 rounded-lg hover:bg-surface-raised"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent
              visibleLinks={visibleLinks}
              user={user}
              handleLogout={handleLogout}
              onNav={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-14 bg-sidebar border-b border-line flex items-center justify-between px-4 sticky top-0 z-20 no-print">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden btn-ghost p-2"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden md:flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-sm font-semibold text-ink-muted">{currentLink?.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-raised border border-line">
              <div className="h-1.5 w-1.5 rounded-full bg-success" />
              <span className="text-xs text-ink-muted font-medium">{user?.name}</span>
              <span className="text-xs text-ink-faint capitalize">· {user?.role}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 animate-fade-up">
          {children}
        </main>
      </div>
    </div>
  )
}
