import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { formatCurrency, formatDateTime } from '../utils/format'
import StatCard from '../components/StatCard'
import Spinner from '../components/Spinner'
import { Monitor, Clock, DollarSign, Activity, RefreshCw, ArrowRight } from 'lucide-react'

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
    available:   { dot: 'bg-accent',    label: 'Available' },
    occupied:    { dot: 'bg-danger',    label: 'Occupied' },
    reserved:    { dot: 'bg-amber-600', label: 'Reserved' },
    maintenance: { dot: 'bg-ink-faint', label: 'Maint.' },
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title text-2xl sm:text-3xl font-extrabold text-ink font-geist">Dashboard</h1>
          <p className="text-xs text-ink-muted mt-1 font-medium">Real-time cafe metrics and active floor state</p>
        </div>
        <button onClick={fetchData} className="btn-dark" aria-label="Refresh">
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline text-xs font-bold">Refresh</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active sessions"
          value={stats?.active_sessions ?? 0}
          icon={Clock}
          sub="Live cafe sessions"
          iconClass="text-ink"
        />
        <StatCard
          label="Available stations"
          value={`${stats?.available_stations ?? 0} / ${stats?.total_stations ?? 0}`}
          icon={Monitor}
          sub="Ready to allocate"
          iconClass="text-ink"
        />
        <StatCard
          label="Today's revenue"
          value={formatCurrency(stats?.today_revenue ?? 0)}
          icon={DollarSign}
          sub="From settled bills"
          valueClass="text-accent font-extrabold"
          iconClass="text-accent"
        />
        <StatCard
          label="Today's sessions"
          value={stats?.today_sessions ?? 0}
          icon={Activity}
          sub="Total served today"
          iconClass="text-ink"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Station Status Grid */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-ink font-geist uppercase tracking-wide">Station status</h2>
              <p className="text-xs text-ink-muted mt-0.5 font-medium">{stations.length} total stations</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-ink-muted font-bold">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" /> Available</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-danger" /> Occupied</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-600" /> Reserved</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ink-faint" /> Maint.</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {stations.map((s) => {
              const cfg = statusConfig[s.status] || statusConfig.maintenance
              return (
                <div
                  key={s.id}
                  className="rounded-[14px] p-3.5 border-2 border-[#2A2407] bg-[#ECE4A9] shadow-[2px_2px_0px_#2A2407] flex items-start justify-between gap-2 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#2A2407] transition-all cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <p className="text-sm font-bold text-ink truncate font-geist">{s.name}</p>
                    </div>
                    <p className="text-xs text-ink-muted ml-4.5 mt-0.5 font-semibold">{s.type}</p>
                    {s.active_session && (
                      <p className="text-xs text-danger ml-4.5 mt-0.5 truncate font-bold">{s.active_session.customer_name}</p>
                    )}
                    {s.upcoming_booking && !s.active_session && (
                      <p className="text-xs text-[#EC7E00] ml-4.5 mt-0.5 truncate font-bold font-mono">
                        Reserved: #{s.upcoming_booking.booking_code}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {stations.length === 0 && (
            <p className="text-center text-xs text-ink-faint py-8 font-medium">No stations configured</p>
          )}

          <div className="mt-5 pt-3.5 border-t-2 border-[#2A2407]/15">
            <Link to="/stations" className="inline-flex items-center gap-1.5 text-xs text-ink hover:text-accent font-bold transition-colors">
              Manage stations <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Recent Bills */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-ink font-geist uppercase tracking-wide">Recent paid bills</h2>
              <p className="text-xs text-ink-muted mt-0.5 font-medium">Latest settled transactions</p>
            </div>
          </div>

          {recentBills.length === 0 ? (
            <div className="text-center py-14">
              <p className="text-xs text-ink-muted font-medium">No paid bills yet today</p>
            </div>
          ) : (
            <div className="divide-y-2 divide-[#2A2407]/10">
              {recentBills.map((b) => (
                <Link
                  key={b.id}
                  to={`/bills/${b.id}`}
                  className="flex items-center justify-between py-2.5 px-2 hover:bg-[#ECE4A9]/40 rounded-lg transition-colors group"
                >
                  <div>
                    <p className="text-xs font-mono font-bold text-ink group-hover:text-accent transition-colors">{b.bill_no}</p>
                    <p className="text-xs text-ink-muted mt-0.5 font-medium">{b.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-ink font-geist">{formatCurrency(b.total)}</p>
                    <p className="text-[11px] text-ink-muted mt-0.5 font-medium">{formatDateTime(b.created_at)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-5 pt-3.5 border-t-2 border-[#2A2407]/15">
            <Link to="/bills" className="inline-flex items-center gap-1.5 text-xs text-ink hover:text-accent font-bold transition-colors">
              View all bills <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
