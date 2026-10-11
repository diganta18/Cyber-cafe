import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { formatCurrency, formatDateTime } from '../utils/format'
import StatCard from '../components/StatCard'
import Spinner from '../components/Spinner'
import { Monitor, Clock, DollarSign, Activity, RefreshCw } from 'lucide-react'

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

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const statusColor = (s) => {
    if (s === 'available') return 'bg-green-100 text-green-700'
    if (s === 'occupied') return 'bg-red-100 text-red-700'
    return 'bg-gray-100 text-gray-600'
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <button onClick={fetchData} className="btn-ghost" aria-label="Refresh">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Active Sessions"
          value={stats?.active_sessions ?? 0}
          icon={Clock}
          color="blue"
        />
        <StatCard
          label="Available Stations"
          value={`${stats?.available_stations ?? 0} / ${stats?.total_stations ?? 0}`}
          icon={Monitor}
          color="green"
        />
        <StatCard
          label="Today's Revenue"
          value={formatCurrency(stats?.today_revenue ?? 0)}
          icon={DollarSign}
          color="amber"
        />
        <StatCard
          label="Today's Sessions"
          value={stats?.today_sessions ?? 0}
          icon={Activity}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Station Status Grid */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Station Status</h2>
          <div className="grid grid-cols-2 gap-2">
            {stations.map((s) => (
              <div
                key={s.id}
                className={`rounded-lg px-3 py-2 flex items-center justify-between ${
                  s.status === 'occupied' ? 'bg-red-50' :
                  s.status === 'available' ? 'bg-green-50' : 'bg-gray-50'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.type}</p>
                  {s.active_session && (
                    <p className="text-xs text-red-600 truncate">{s.active_session.customer_name}</p>
                  )}
                </div>
                <span className={`badge ${statusColor(s.status)} text-xs`}>{s.status}</span>
              </div>
            ))}
          </div>
          <Link to="/stations" className="text-xs text-primary-600 hover:underline mt-4 inline-block">
            Manage stations →
          </Link>
        </div>

        {/* Recent Bills */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Paid Bills</h2>
          {recentBills.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No bills yet today</p>
          ) : (
            <div className="space-y-2">
              {recentBills.map((b) => (
                <Link
                  key={b.id}
                  to={`/bills/${b.id}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{b.bill_no}</p>
                    <p className="text-xs text-gray-500">{b.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(b.total)}</p>
                    <p className="text-xs text-gray-400">{formatDateTime(b.created_at)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <Link to="/bills" className="text-xs text-primary-600 hover:underline mt-4 inline-block">
            View all bills →
          </Link>
        </div>
      </div>
    </div>
  )
}
