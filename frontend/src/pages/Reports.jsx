import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { formatCurrency, formatDate, apiError } from '../utils/format'
import StatCard from '../components/StatCard'
import Spinner from '../components/Spinner'
import { BarChart2, Download, TrendingUp, Monitor, Calendar } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const today = new Date().toISOString().slice(0, 10)
const monthAgo = new Date(Date.now() - 30 * 86400 * 1000).toISOString().slice(0, 10)

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#FFFFFF', border: '1px solid #E4E2DC', borderRadius: '8px', padding: '10px 14px' }}>
        <p style={{ color: '#6E6D68', fontSize: '11px', marginBottom: '4px' }}>{label}</p>
        <p style={{ color: '#3B7A57', fontSize: '14px', fontWeight: '700', margin: 0 }}>{formatCurrency(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

export default function Reports({ toast }) {
  const [from, setFrom] = useState(monthAgo)
  const [to, setTo] = useState(today)
  const [activeTab, setActiveTab] = useState('revenue')

  const [revenue, setRevenue] = useState(null)
  const [utilization, setUtilization] = useState([])
  const [topCustomers, setTopCustomers] = useState([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [revRes, utilRes, topRes] = await Promise.all([
        api.get(`/reports/revenue?from=${from}&to=${to}`),
        api.get(`/reports/utilization?from=${from}&to=${to}`),
        api.get(`/reports/top-customers?from=${from}&to=${to}`),
      ])
      setRevenue(revRes.data.data)
      setUtilization(utilRes.data.data)
      setTopCustomers(topRes.data.data)
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setLoading(false)
    }
  }, [from, to, toast])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await api.get(`/reports/export?type=${activeTab}&from=${from}&to=${to}`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `${activeTab}_report_${from}_${to}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV downloaded')
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setExporting(false)
    }
  }

  const chartData = revenue?.days?.map((d) => ({
    date: formatDate(d.date),
    revenue: d.revenue,
    bills: d.bills,
  })) || []

  const tabs = [
    { key: 'revenue',       label: 'Revenue' },
    { key: 'utilization',   label: 'Utilization' },
    { key: 'top-customers', label: 'Top Customers' },
  ]

  const quickRanges = [
    { label: '7d',  days: 7 },
    { label: '30d', days: 30 },
    { label: '90d', days: 90 },
  ]

  /* rank indicator styles */
  const rankStyle = (idx) => {
    if (idx === 0) return 'bg-warning/15 text-warning ring-1 ring-warning/20'
    if (idx === 1) return 'bg-surface-raised text-ink-muted ring-1 ring-line'
    if (idx === 2) return 'bg-surface-raised text-ink-faint ring-1 ring-line'
    return 'bg-surface-raised text-ink-faint ring-1 ring-line'
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="text-sm text-ink-muted mt-0.5">{from} → {to}</p>
        </div>
        <button id="export-report-btn" className="btn-secondary" onClick={handleExport} disabled={exporting}>
          {exporting ? <Spinner size="sm" /> : <Download className="h-4 w-4" />}
          Export CSV
        </button>
      </div>

      {/* Date Range */}
      <div className="card p-4 flex items-center gap-4 flex-wrap">
        <Calendar className="h-4 w-4 text-ink-faint flex-shrink-0" />
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide">From</label>
          <input type="date" className="input w-38 text-sm" value={from} max={to} onChange={(e) => setFrom(e.target.value)} id="report-from" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide">To</label>
          <input type="date" className="input w-38 text-sm" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} id="report-to" />
        </div>
        <div className="flex gap-1.5 ml-auto">
          {quickRanges.map(({ label, days }) => (
            <button
              key={label}
              className="px-3 py-1.5 text-xs rounded-lg font-semibold bg-surface-raised border border-line text-ink-faint hover:text-ink-muted hover:border-line/60 transition-all"
              onClick={() => {
                setFrom(new Date(Date.now() - days * 86400 * 1000).toISOString().slice(0, 10))
                setTo(today)
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Revenue"  value={formatCurrency(revenue?.total_revenue ?? 0)} icon={TrendingUp} color="green"  />
            <StatCard label="Total Bills"    value={revenue?.total_bills ?? 0}                   icon={BarChart2}  color="blue"   />
            <StatCard label="Avg Bill Value" value={formatCurrency(revenue?.avg_bill ?? 0)}      icon={TrendingUp} color="amber"  />
            <StatCard label="Total Sessions" value={revenue?.total_sessions ?? 0}               icon={Monitor}    color="purple" />
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2 text-sm rounded-lg font-semibold transition-all duration-150 ${
                  activeTab === key
                    ? 'bg-accent/15 text-accent border border-accent/30'
                    : 'bg-surface-raised border border-line text-ink-faint hover:text-ink-muted hover:border-line/60'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Revenue Chart */}
          {activeTab === 'revenue' && (
            <div className="card p-6">
              <h2 className="text-base font-bold text-ink mb-5">Daily Revenue</h2>
              {chartData.length === 0 ? (
                <p className="text-center text-ink-faint text-sm py-10">No revenue data in this period</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4E2DC" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6E6D68' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6E6D68' }} tickFormatter={(v) => `₹${v}`} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,122,87,0.06)' }} />
                    <Bar dataKey="revenue" fill="#3B7A57" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {/* Utilization */}
          {activeTab === 'utilization' && (
            <div className="card p-6">
              <h2 className="text-base font-bold text-ink mb-5">Station Utilization</h2>
              <div className="space-y-4">
                {utilization.map((s) => (
                  <div key={s.station_id} className="flex items-center gap-4">
                    <div className="w-28 text-sm font-semibold text-ink flex-shrink-0 truncate">{s.station_name}</div>
                    <div className="flex-1 bg-surface-raised rounded-full h-2 overflow-hidden border border-line">
                      <div
                        className="h-2 rounded-full bg-accent transition-all duration-500"
                        style={{ width: `${Math.min(100, s.utilization_pct || 0)}%` }}
                      />
                    </div>
                    <div className="text-right w-32 flex-shrink-0">
                      <span className="text-sm font-bold text-ink">{(s.utilization_pct || 0).toFixed(1)}%</span>
                      <span className="text-xs text-ink-faint ml-2">({s.session_count} sess.)</span>
                    </div>
                    <div className="text-sm font-semibold text-ink-muted w-24 flex-shrink-0 text-right font-mono">{formatCurrency(s.revenue)}</div>
                  </div>
                ))}
                {utilization.length === 0 && <p className="text-center text-ink-faint text-sm py-10">No utilization data</p>}
              </div>
            </div>
          )}

          {/* Top Customers */}
          {activeTab === 'top-customers' && (
            <div className="card p-6">
              <h2 className="text-base font-bold text-ink mb-5">Top Customers by Spend</h2>
              <div className="space-y-2">
                {topCustomers.map((c, idx) => (
                  <div key={c.customer_id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-raised transition-colors">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${rankStyle(idx)}`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-ink truncate">{c.customer_name || c.name}</p>
                      <p className="text-xs text-ink-faint">{c.session_count || c.sessions} sessions</p>
                    </div>
                    <span className="font-bold text-success font-mono">{formatCurrency(c.total_spent)}</span>
                  </div>
                ))}
                {topCustomers.length === 0 && <p className="text-center text-ink-faint text-sm py-10">No customer data</p>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
