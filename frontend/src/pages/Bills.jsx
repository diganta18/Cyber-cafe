import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { formatCurrency, formatDateTime, apiError } from '../utils/format'
import Table from '../components/Table'
import { Search, ExternalLink, CreditCard } from 'lucide-react'
import Spinner from '../components/Spinner'
import Modal from '../components/Modal'

const STATUS_TABS = ['all', 'unpaid', 'paid', 'void']

export default function Bills({ toast }) {
  const navigate = useNavigate()
  const [bills, setBills] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const LIMIT = 15

  const [payModal, setPayModal] = useState(null)
  const [payMode, setPayMode] = useState('cash')
  const [paying, setPaying] = useState(false)

  const fetchBills = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: LIMIT })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (search) params.set('search', search)
      const res = await api.get(`/bills?${params}`)
      setBills(res.data.data.items)
      setTotal(res.data.data.total)
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, toast])

  useEffect(() => { fetchBills() }, [fetchBills])

  const handlePay = async () => {
    setPaying(true)
    try {
      await api.post(`/bills/${payModal.id}/pay`, { mode: payMode })
      toast.success('Payment recorded')
      setPayModal(null)
      fetchBills()
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setPaying(false)
    }
  }

  const totalPages = Math.ceil(total / LIMIT)

  const columns = [
    {
      key: 'bill_no', label: 'Bill No.',
      render: (val) => <span className="font-mono text-sm font-semibold text-gray-800">{val}</span>,
    },
    { key: 'customer_name', label: 'Customer' },
    { key: 'station_name', label: 'Station' },
    {
      key: 'total', label: 'Total',
      render: (val) => <span className="font-semibold">{formatCurrency(val)}</span>,
    },
    {
      key: 'discount', label: 'Discount',
      render: (val) => val > 0 ? <span className="text-green-600">{formatCurrency(val)}</span> : <span className="text-gray-400">—</span>,
    },
    {
      key: 'status', label: 'Status',
      render: (val) => <span className={`badge badge-${val}`}>{val}</span>,
    },
    { key: 'created_at', label: 'Date', render: (val) => formatDateTime(val) },
    {
      key: 'id', label: '',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          {row.status === 'unpaid' && (
            <button
              onClick={(e) => { e.stopPropagation(); setPayModal(row); setPayMode('cash') }}
              className="btn-primary py-1 px-2 text-xs"
              aria-label="Pay"
            >
              <CreditCard className="h-3.5 w-3.5" /> Pay
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/bills/${row.id}`) }}
            className="btn-ghost py-1 px-2 text-xs"
            aria-label="Open invoice"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Bills</h1>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1) }}
            className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
              statusFilter === s ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <form
          className="flex gap-2 ml-auto"
          onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1) }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Bill no or customer…"
              className="input pl-9 w-52"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-secondary">Search</button>
        </form>
      </div>

      <div className="card">
        <Table
          columns={columns}
          data={bills}
          loading={loading}
          emptyMessage="No bills match your filter."
          onRowClick={(row) => navigate(`/bills/${row.id}`)}
        />
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}</p>
            <div className="flex gap-2">
              <button className="btn-secondary py-1 px-3 text-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span className="text-xs text-gray-500 self-center">{page} / {totalPages}</span>
              <button className="btn-secondary py-1 px-3 text-xs" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Pay Modal */}
      <Modal isOpen={!!payModal} onClose={() => setPayModal(null)} title={`Record Payment — ${payModal?.bill_no}`} size="sm">
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 flex justify-between items-center">
            <span className="text-sm text-gray-500">Amount Due</span>
            <span className="text-xl font-bold text-gray-900">{formatCurrency(payModal?.total)}</span>
          </div>
          <div>
            <label className="label">Payment Mode</label>
            <select className="input" value={payMode} onChange={(e) => setPayMode(e.target.value)} id="payment-mode-select">
              {['cash', 'upi', 'card'].map((m) => (
                <option key={m} value={m}>{m.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setPayModal(null)}>Cancel</button>
            <button id="confirm-pay-btn" className="btn-primary" onClick={handlePay} disabled={paying}>
              {paying ? <Spinner size="sm" /> : <CreditCard className="h-4 w-4" />}
              {paying ? 'Processing…' : 'Confirm Payment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
