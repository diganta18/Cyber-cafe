import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Monitor, Users, Clock, Receipt, Package,
  BarChart2, UserCog, LayoutDashboard, Menu, X, LogOut, ChevronDown, ShieldCheck,
  Calendar, ExternalLink
} from 'lucide-react'

const allNavLinks = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard',        roles: ['admin','staff'] },
  { to: '/stations',  icon: Monitor,         label: 'Stations',         roles: ['admin','staff'] },
  { to: '/sessions',  icon: Clock,           label: 'Active Sessions',  roles: ['admin','staff'] },
  { to: '/bookings',  icon: Calendar,        label: 'Bookings & Prints', roles: ['admin','staff'] },
  { to: '/customers', icon: Users,           label: 'Customers',        roles: ['admin','staff'] },
  { to: '/bills',     icon: Receipt,         label: 'Bills',            roles: ['admin','staff'] },
  { to: '/services',  icon: Package,         label: 'Services & Stock', roles: ['admin', 'staff'] },
  { to: '/reports',   icon: BarChart2,       label: 'Reports',          roles: ['admin'] },
  { to: '/staff',     icon: UserCog,         label: 'Staff',            roles: ['admin'] },
]

function SidebarContent({ visibleLinks, user, handleLogout, onNav }) {
  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Brand Header */}
      <div className="px-6 py-5 border-b border-sidebar-border/60">
        <h1 className="text-2xl sm:text-[28px] font-pricedown text-white tracking-wide select-none">
          Cyber Café
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3.5 py-4 overflow-y-auto space-y-1.5">
        <p className="text-xs font-bold text-sidebar-muted/70 px-3 mb-2 uppercase tracking-wider">Navigation</p>
        {visibleLinks.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNav}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 ${
                isActive
                  ? 'bg-[#EC7E00] text-white border-2 border-[#2A2407] shadow-[2px_2px_0px_rgba(0,0,0,0.3)]'
                  : 'text-sidebar-muted hover:text-white hover:bg-white/[0.08]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`h-4 w-4 flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-sidebar-muted group-hover:text-white'}`} />
                <span className="truncate">{label}</span>
                {isActive && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-white flex-shrink-0" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User profile card (Option 1: Warm Cream Neo-Brutalist Card) */}
      <div className="px-3 pb-4 pt-3 border-t-2 border-[#2A2407]/40">
        <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-[#ECE4A9] border-2 border-[#2A2407] shadow-[3px_3px_0px_#2A2407] transition-all">
          {/* Avatar Icon / Initial */}
          <div className={`h-9 w-9 rounded-xl border-2 border-[#2A2407] shadow-[1px_1px_0px_#2A2407] flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0 ${
            user?.role === 'admin' ? 'bg-[#EC7E00]' : 'bg-[#2A2407]'
          }`}>
            {user?.name ? user.name.charAt(0).toUpperCase() : (user?.role === 'admin' ? 'A' : 'S')}
          </div>

          {/* User Name & Role Tag */}
          <div className="min-w-0 flex-1">
            <p className="text-[#2A2407] text-xs font-extrabold truncate font-geist leading-tight">
              {user?.name || (user?.role === 'admin' ? 'Admin' : 'Staff')}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`h-1.5 w-1.5 rounded-full ${user?.role === 'admin' ? 'bg-[#EC7E00]' : 'bg-[#2A2407]'}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#645B38]">
                {user?.role}
              </span>
            </div>
          </div>

          {/* Integrated Quick Logout Button */}
          <button
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
            className="h-8 w-8 rounded-xl border-2 border-[#2A2407] bg-white hover:bg-danger text-[#2A2407] hover:text-white shadow-[1px_1px_0px_#2A2407] hover:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center flex-shrink-0 cursor-pointer group"
          >
            <LogOut className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const userMenuRef = useRef(null)

  const visibleLinks = allNavLinks.filter(link => link.roles.includes(user?.role))

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  useEffect(() => {
    const handleOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserDropdownOpen(false)
      }
    }
    const handleKey = (e) => {
      if (e.key === 'Escape') setUserDropdownOpen(false)
    }
    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleOutside)
      document.addEventListener('keydown', handleKey)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [userDropdownOpen])

  const currentLink = allNavLinks.find(l => l.to === location.pathname) || allNavLinks[0]

  return (
    <div className="min-h-screen flex bg-bg">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-60 z-30 bg-sidebar border-r-2 border-[#2A2407]/40">
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
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative flex flex-col w-64 bg-sidebar border-r-2 border-[#2A2407] z-50 animate-slide-in">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-3 text-sidebar-muted hover:text-white p-1.5 rounded-lg hover:bg-white/10"
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
        <header className="h-14 bg-bg border-b-2 border-[#2A2407]/15 flex items-center justify-between px-6 sticky top-0 z-20 no-print">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden btn-ghost p-2"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5 text-ink" />
            </button>
            <div className="hidden md:flex items-center gap-2.5">
              <span className="text-sm font-bold text-ink">{currentLink?.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 relative" ref={userMenuRef}>
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border-2 border-[#2A2407] shadow-[2px_2px_0px_#2A2407] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#2A2407] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0px_#2A2407] transition-all cursor-pointer"
              aria-haspopup="true"
              aria-expanded={userDropdownOpen}
            >
              <div className="h-2 w-2 rounded-full bg-accent" />
              <span className="text-xs text-ink font-bold">{user?.name}</span>
              <span className="text-xs text-ink-muted">·</span>
              <span className="text-xs text-ink-muted capitalize font-semibold">{user?.role}</span>
              <ChevronDown className={`h-3.5 w-3.5 text-ink transition-transform duration-200 stroke-[2.5] ${userDropdownOpen ? 'rotate-180 text-accent' : ''}`} />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white border-2 border-[#2A2407] rounded-2xl shadow-[4px_4px_0px_#2A2407] p-2 z-50 animate-dropdown font-geist">
                <div className="px-3 py-2 border-b-2 border-[#2A2407]/15 mb-1.5 bg-[#ECE4A9]/40 rounded-xl">
                  <p className="text-xs font-bold text-ink truncate">{user?.name}</p>
                  <p className="text-[11px] font-semibold text-ink-muted capitalize flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="h-3 w-3 text-accent" /> {user?.role} account
                  </p>
                </div>
                <button
                  onClick={() => { setUserDropdownOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-danger hover:bg-danger/10 rounded-xl transition-all cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 md:p-8 animate-fade-in max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
