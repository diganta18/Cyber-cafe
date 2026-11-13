import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { formatCurrency, formatDateTime, apiError } from '../utils/format'
import Table from '../components/Table'
import { Search, ExternalLink, CreditCard, ShoppingBag } from 'lucide-react'
import Spinner from '../components/Spinner'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Select from '../components/Select'
import CounterSaleModal from '../components/CounterSaleModal'

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
  const [counterModal, setCounterModal] = useState(false)

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
      key: 'bill_no', label: 'Bill number',
      render: (val) => <span className="font-mono text-xs font-semibold text-ink">{val}</span>,
    },
    {
      key: 'customer_name', label: 'Customer',
      render: (val) => <span className="font-medium text-ink">{val}</span>,
    },
    { key: 'station_name', label: 'Station', render: (val) => <span className="text-xs text-ink-muted">{val}</span> },
    {
      key: 'total', label: 'Total',
      render: (val) => <span className="font-semibold text-ink font-geist text-xs">{formatCurrency(val)}</span>,
    },
    {
      key: 'discount', label: 'Discount',
      render: (val) => val > 0
        ? <span className="text-warning font-medium font-geist text-xs">{formatCurrency(val)}</span>
        : <span className="text-ink-faint text-xs">—</span>,
    },
    {
      key: 'status', label: 'Status',
      render: (val) => <span className={`badge badge-${val}`}>{val}</span>,
    },
    {
      key: 'created_at', label: 'Date',
      render: (val) => <span className="text-xs text-ink-faint">{formatDateTime(val)}</span>,
    },
    {
      key: 'id', label: '',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.status === 'unpaid' && (
            <button
              onClick={(e) => { e.stopPropagation(); setPayModal(row); setPayMode('cash') }}
              className="btn-primary py-1 px-2.5 text-xs"
              aria-label="Pay"
            >
              <CreditCard className="h-3 w-3" /> Pay
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
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bills</h1>
          <p className="text-xs text-ink-muted mt-1">{total} total bills recorded</p>
        </div>
        <Button id="open-counter-sale-btn" size="sm" onClick={() => setCounterModal(true)}>
          <ShoppingBag className="h-4 w-4 mr-1.5" /> Quick counter sale
        </Button>
      </div>

      {/* Status tabs + search */}
      <div className="flex gap-3 flex-wrap items-center justify-between">
        <div className="tab-group">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1) }}
              className={`tab-item ${statusFilter === s ? 'tab-item-active' : ''}`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1) }}
        >
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none stroke-[2.2]" />
            <input
              type="text"
              placeholder="Search bill or customer..."
              className="input pl-10 w-56 text-xs font-medium"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-secondary text-xs py-1.5 px-3">Search</button>
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
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-line">
            <p className="text-xs text-ink-faint">{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}</p>
            <div className="flex items-center gap-2">
              <button className="btn-secondary py-1 px-3 text-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span className="text-xs text-ink-muted px-1">{page} / {totalPages}</span>
              <button className="btn-secondary py-1 px-3 text-xs" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Pay Modal */}
      <Modal isOpen={!!payModal} onClose={() => setPayModal(null)} title={`Record Payment — ${payModal?.bill_no}`} size="sm">
        <div className="space-y-4">
          <div className="bg-[#ECE4A9] border-2 border-[#2A2407] rounded-xl p-5 flex justify-between items-center shadow-[2px_2px_0px_#2A2407]">
            <span className="text-sm text-ink font-bold uppercase tracking-wider">Amount Due</span>
            <span className="text-3xl font-extrabold text-accent font-mono">{formatCurrency(payModal?.total)}</span>
          </div>
          <div>
            <Select
              id="payment-mode-select"
              label="Payment Mode"
              value={payMode}
              onChange={(e) => setPayMode(e.target.value)}
              options={[
                { value: 'cash', label: 'CASH' },
                { value: 'upi', label: 'UPI' },
                { value: 'card', label: 'CARD' },
              ]}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setPayModal(null)}>Cancel</button>
            <Button id="confirm-pay-btn" size="sm" onClick={handlePay} loading={paying}>
              {paying ? 'Processing…' : 'Confirm Payment'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Quick Counter Sale Modal */}
      <CounterSaleModal
        isOpen={counterModal}
        onClose={() => setCounterModal(false)}
        onSuccess={(bill) => {
          fetchBills()
          if (bill?.id) navigate(`/bills/${bill.id}`)
        }}
        toast={toast}
      />
    </div>
  )
}
