import { useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiError } from '../utils/format'
import { User, Lock, Eye, EyeOff, Shield, Gamepad2, ArrowRight } from 'lucide-react'
import Spinner from '../components/Spinner'

export default function Login({ toast }) {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.username, form.password)
      navigate('/')
    } catch (err) {
      setError(apiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background ambient warmth */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-accent/[0.04] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-warning/[0.04] rounded-full blur-3xl pointer-events-none" />

      {/* CyberCafe Header Branding */}
      <div className="text-center mb-12 relative z-10 animate-fade-up">
        <h1 className="text-4xl sm:text-5xl font-pricedown text-[#2A2407] tracking-wide select-none drop-shadow-[2px_2px_0px_rgba(236,126,0,0.5)]">
          Cyber Café
        </h1>
      </div>

      {/* Card Wrapper with Floating Avatar Badge */}
      <div className="w-full max-w-[370px] relative z-10 animate-fade-up">
        {/* Floating Top Avatar Badge centered on the top border */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20">
          <div className="w-20 h-20 rounded-full bg-[#2A2407] border-[3.5px] border-white shadow-[0_4px_14px_rgba(42,36,7,0.18)] flex items-center justify-center">
            <User className="w-10 h-10 text-white stroke-[1.6]" />
          </div>
        </div>

        {/* Card Box: avatar sits just above the text box with a clean snug ~14px gap */}
        <div className="bg-white border-[2.5px] border-[#2A2407] rounded-[28px] px-6 sm:px-7 pb-6 sm:pb-7 pt-14 shadow-[0_16px_40px_-8px_rgba(42,36,7,0.15)] relative">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Username / Email Field */}
            <div>
              <label htmlFor="username" className="sr-only">Email ID or Username</label>
              <div className="flex border-2 border-[#2A2407] rounded-md overflow-hidden bg-white focus-within:ring-2 focus-within:ring-[#EC7E00] focus-within:border-[#EC7E00] transition-all">
                <div className="w-12 bg-[#2A2407] flex items-center justify-center text-white border-r-2 border-[#2A2407] flex-shrink-0" aria-hidden="true">
                  <User className="h-5 w-5" />
                </div>
                <input
                  id="username"
                  type="text"
                  className="flex-1 px-3.5 py-2.5 sm:py-3 text-sm text-[#2A2407] placeholder:text-[#645B38] bg-transparent focus:outline-none font-medium"
                  placeholder="Email ID / Username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <div className="flex border-2 border-[#2A2407] rounded-md overflow-hidden bg-white focus-within:ring-2 focus-within:ring-[#EC7E00] focus-within:border-[#EC7E00] transition-all">
                <div className="w-12 bg-[#2A2407] flex items-center justify-center text-white border-r-2 border-[#2A2407] flex-shrink-0" aria-hidden="true">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  className="flex-1 px-3.5 py-2.5 sm:py-3 text-sm text-[#2A2407] placeholder:text-[#645B38] bg-transparent focus:outline-none font-medium"
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="px-3 text-[#4F4723] hover:text-[#2A2407] transition-colors focus:outline-none flex items-center justify-center"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#3D3717] hover:text-[#2A2407] transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-2 border-[#2A2407] text-[#EC7E00] focus:ring-[#EC7E00] accent-[#EC7E00] cursor-pointer"
                />
                <span>Remember me</span>
              </label>
              <span className="text-[11px] italic font-medium text-[#4F4723] hover:text-[#2A2407] cursor-pointer transition-colors underline decoration-dotted">
                Forgot Password?
              </span>
            </div>

            {/* Error Message */}
            {error && (
              <div className="px-3 py-2 bg-danger/10 border border-danger/25 rounded-md text-xs text-danger flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-danger flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Button */}
            <div className="pt-2">
              <button
                type="submit"
                id="login-submit"
                disabled={loading}
                className="w-full bg-[#EC7E00] hover:bg-[#D46F00] active:scale-[0.98] text-[#1C1805] font-extrabold text-sm sm:text-[15px] py-3 sm:py-3.5 tracking-[0.2em] rounded-md border-2 border-[#2A2407] shadow-[2px_2px_0px_#2A2407] hover:shadow-[3px_3px_0px_#2A2407] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer uppercase"
              >
                {loading && <Spinner size="sm" />}
                <span>{loading ? 'LOGGING IN…' : 'LOGIN'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Customer Self-Service Portal Entry */}
        <div className="mt-4">
          <Link
            to="/portal"
            className="group block bg-[#ECE4A9] border-[2.5px] border-[#2A2407] rounded-2xl p-3.5 sm:p-4 shadow-[3px_3px_0px_#2A2407] hover:shadow-[5px_5px_0px_#2A2407] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2A2407] text-[#ECE4A9] flex items-center justify-center border-2 border-[#2A2407] shadow-[1px_1px_0px_#2A2407] flex-shrink-0 group-hover:scale-105 transition-transform" aria-hidden="true">
                  <Gamepad2 className="w-5 h-5 text-[#EC7E00]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-extrabold text-[#2A2407] uppercase tracking-wider">
                      Customer Portal
                    </p>
                    <span className="text-[9px] font-extrabold uppercase bg-[#2A2407] text-[#FAF7EB] px-1.5 py-0.5 rounded tracking-wider">
                      No Login Needed
                    </span>
                  </div>
                  <p className="text-[11px] text-[#4F4723] font-semibold mt-0.5">
                    Book Gaming / PC Slots & Send Printouts
                  </p>
                </div>
              </div>
              <div className="h-8 w-8 rounded-lg bg-white border-2 border-[#2A2407] shadow-[1px_1px_0px_#2A2407] flex items-center justify-center flex-shrink-0 group-hover:bg-[#EC7E00] group-hover:text-white transition-colors" aria-hidden="true">
                <ArrowRight className="w-4 h-4 text-[#2A2407] group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-[#574F2F] mt-7">
          Cyber Café Management System © {new Date().getFullYear()}
        </p>
      </div>
    </main>
  )
}
