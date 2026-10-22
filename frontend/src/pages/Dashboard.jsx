import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { formatCurrency, formatDateTime } from '../utils/format'
import StatCard from '../components/StatCard'
import Spinner from '../components/Spinner'
import { Monitor, Clock, DollarSign, Activity, RefreshCw, Circle, ArrowRight } from 'lucide-react'

export default function Dashboard({ toast }) {
  const [stats, setStats] = useState(null)
  const [recentBills, setRecentBills] = useState([])
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, billsRes, stationsRes] = await Promise.all([
        api.get('/reports/dashboard'),
        api.get('/bills?limit=5&status=paid'),
        api.get('/stations'),
      ])
      setStats(dashRes.data.data)
      setRecentBills(billsRes.data.data.items)
      setStations(stationsRes.data.data)
    } catch {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) return (
    <div className="flex justify-center items-center py-32">
      <Spinner size="lg" />
    </div>
  )

  const statusConfig = {
    available:   { dot: 'bg-success',   text: 'text-success' },
    occupied:    { dot: 'bg-danger',    text: 'text-danger' },
    maintenance: { dot: 'bg-ink-faint', text: 'text-ink-faint' },
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-ink-muted mt-0.5">Real-time overview of your cyber cafe</p>
        </div>
        <button onClick={fetchData} className="btn-ghost gap-2" aria-label="Refresh">
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Sessions"     value={stats?.active_sessions ?? 0}                                          icon={Clock}      color="cyan"  />
        <StatCard label="Available Stations"  value={`${stats?.available_stations ?? 0} / ${stats?.total_stations ?? 0}`} icon={Monitor}    color="green" />
        <StatCard label="Today's Revenue"     value={formatCurrency(stats?.today_revenue ?? 0)}                           icon={DollarSign} color="amber" />
        <StatCard label="Today's Sessions"    value={stats?.today_sessions ?? 0}                                          icon={Activity}   color="red"   />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Station Status Grid */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-ink">Station Status</h2>
            <div className="flex items-center gap-3 text-xs text-ink-muted">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" /> Available</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-danger" /> Occupied</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-ink-faint" /> Maintenance</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {stations.map((s) => {
              const cfg = statusConfig[s.status] || statusConfig.maintenance
              return (
                <div
                  key={s.id}
                  className="rounded-xl p-3 border border-[#DCDAD3] bg-surface-raised flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Circle className={`h-2 w-2 fill-current ${cfg.text} flex-shrink-0`} />
                      <p className="text-sm font-semibold text-ink truncate">{s.name}</p>
                    </div>
                    <p className="text-xs text-ink-muted ml-4 mt-0.5">{s.type}</p>
                    {s.active_session && (
                      <p className="text-xs text-accent ml-4 mt-0.5 truncate">{s.active_session.customer_name}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <Link to="/stations" className="mt-4 inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 font-medium transition-colors">
            Manage stations <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Recent Bills */}
        <div className="card p-6">
          <h2 className="text-base font-bold text-ink mb-4">Recent Paid Bills</h2>

          {recentBills.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-ink-muted">No paid bills yet today</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentBills.map((b) => (
                <Link
                  key={b.id}
                  to={`/bills/${b.id}`}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-surface-raised transition-colors group"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink group-hover:text-accent transition-colors font-mono">{b.bill_no}</p>
                    <p className="text-xs text-ink-muted">{b.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-success">{formatCurrency(b.total)}</p>
                    <p className="text-xs text-ink-muted">{formatDateTime(b.created_at)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <Link to="/bills" className="mt-4 inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 font-medium transition-colors">
            View all bills <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
