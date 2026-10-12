import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { formatCurrency, formatDate, apiError } from '../utils/format'
import StatCard from '../components/StatCard'
import Spinner from '../components/Spinner'
import { BarChart2, Download, TrendingUp, Users, Monitor } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts'

const today = new Date().toISOString().slice(0, 10)
const monthAgo = new Date(Date.now() - 30 * 86400 * 1000).toISOString().slice(0, 10)

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

  const chartData = revenue?.daily?.map((d) => ({
    date: formatDate(d.date),
    revenue: d.revenue,
    bills: d.bills,
  })) || []

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
        <button
          id="export-report-btn"
          className="btn-secondary"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? <Spinner size="sm" /> : <Download className="h-4 w-4" />}
          Export CSV
        </button>
      </div>

      {/* Date Range */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 font-medium">From</label>
          <input type="date" className="input w-40" value={from} max={to} onChange={(e) => setFrom(e.target.value)} id="report-from" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 font-medium">To</label>
          <input type="date" className="input w-40" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} id="report-to" />
        </div>
        {/* Quick ranges */}
        {[
          { label: '7 days', days: 7 },
          { label: '30 days', days: 30 },
          { label: '90 days', days: 90 },
        ].map(({ label, days }) => (
          <button
            key={label}
            className="btn-ghost text-xs"
            onClick={() => {
              setFrom(new Date(Date.now() - days * 86400 * 1000).toISOString().slice(0, 10))
              setTo(today)
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Revenue" value={formatCurrency(revenue?.total_revenue ?? 0)} icon={TrendingUp} color="green" />
            <StatCard label="Total Bills" value={revenue?.total_bills ?? 0} icon={BarChart2} color="blue" />
            <StatCard label="Avg Bill Value" value={formatCurrency(revenue?.avg_bill ?? 0)} icon={TrendingUp} color="amber" />
            <StatCard label="Total Sessions" value={revenue?.total_sessions ?? 0} icon={Monitor} color="purple" />
          </div>

          {/* Tab switcher */}
          <div className="flex gap-2 mb-4">
            {['revenue', 'utilization', 'top-customers'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                  activeTab === tab ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab === 'revenue' ? 'Revenue' : tab === 'utilization' ? 'Utilization' : 'Top Customers'}
              </button>
            ))}
          </div>

          {/* Revenue Chart */}
          {activeTab === 'revenue' && (
            <div className="card p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Daily Revenue</h2>
              {chartData.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No revenue data in this period</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Bar dataKey="revenue" fill="#2563EB" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {/* Utilization */}
          {activeTab === 'utilization' && (
            <div className="card p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Station Utilization</h2>
              <div className="space-y-4">
                {utilization.map((s) => (
                  <div key={s.station_id} className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium text-gray-700 flex-shrink-0">{s.station_name}</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-3 rounded-full bg-primary-600 transition-all"
                        style={{ width: `${Math.min(100, s.utilization_pct || 0)}%` }}
                      />
                    </div>
                    <div className="text-right w-28 flex-shrink-0">
                      <span className="text-sm font-semibold text-gray-700">{(s.utilization_pct || 0).toFixed(1)}%</span>
                      <span className="text-xs text-gray-400 ml-2">({s.session_count} sessions)</span>
                    </div>
                    <div className="text-sm text-gray-500 w-24 flex-shrink-0 text-right">{formatCurrency(s.revenue)}</div>
                  </div>
                ))}
                {utilization.length === 0 && <p className="text-center text-gray-400 text-sm py-8">No utilization data</p>}
              </div>
            </div>
          )}

          {/* Top Customers */}
          {activeTab === 'top-customers' && (
            <div className="card p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Top Customers by Spend</h2>
              <div className="space-y-3">
                {topCustomers.map((c, idx) => (
                  <div key={c.customer_id} className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full bg-primary-100 text-primary-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{c.customer_name}</p>
                      <p className="text-xs text-gray-400">{c.session_count} sessions</p>
                    </div>
                    <span className="font-semibold text-gray-900">{formatCurrency(c.total_spent)}</span>
                  </div>
                ))}
                {topCustomers.length === 0 && <p className="text-center text-gray-400 text-sm py-8">No customer data</p>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
