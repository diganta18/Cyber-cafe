import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiError } from '../utils/format'
import { Zap, Eye, EyeOff, Shield } from 'lucide-react'
import Spinner from '../components/Spinner'

export default function Login({ toast }) {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
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
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/[0.04] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-warning/[0.03] rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[360px] relative z-10 animate-fade-up">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-accent mb-5 shadow-[0_8px_24px_-4px_rgba(59,122,87,0.4)]">
            <Zap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-[28px] font-bold text-ink tracking-tight leading-tight">CyberCafe</h1>
          <p className="text-accent font-bold text-[11px] tracking-[0.2em] uppercase mt-1">Manager Pro</p>
          <p className="text-ink-muted text-sm mt-2.5">Sign in to your workspace</p>
        </div>

        {/* Card */}
        <div className="card p-7 shadow-[0_16px_40px_-8px_rgba(24,24,27,0.12)]">
          {/* Security badge */}
          <div className="flex items-center gap-2 bg-accent/8 border border-accent/15 rounded-lg px-3 py-2 mb-6">
            <Shield className="h-3.5 w-3.5 text-accent flex-shrink-0" />
            <span className="text-xs text-accent font-semibold">Secure admin access</span>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label htmlFor="username" className="label">Username</label>
              <input
                id="username"
                type="text"
                className="input"
                placeholder="Enter your username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                autoComplete="username"
                required
              />
            </div>
            <div className="mb-6">
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-muted transition-colors"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-5 px-3 py-2.5 bg-danger/8 border border-danger/20 rounded-lg text-sm text-danger flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-danger flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              id="login-submit"
              className="btn-primary w-full justify-center py-2.5 text-[15px]"
              disabled={loading}
            >
              {loading ? <Spinner size="sm" /> : null}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-ink-faint mt-6">
          Cyber Café Management System © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
