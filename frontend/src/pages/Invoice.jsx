import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { formatCurrency, formatDateTime, formatDuration, apiError } from '../utils/format'
import { Printer, ArrowLeft, CreditCard, Zap } from 'lucide-react'
import Spinner from '../components/Spinner'
import Modal from '../components/Modal'

export default function Invoice({ toast }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [bill, setBill] = useState(null)
  const [loading, setLoading] = useState(true)

  const [payModal, setPayModal] = useState(false)
  const [payMode, setPayMode] = useState('cash')
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    api.get(`/bills/${id}`)
      .then((res) => setBill(res.data.data))
      .catch((err) => toast.error(apiError(err)))
      .finally(() => setLoading(false))
  }, [id, toast])

  const handlePay = async () => {
    setPaying(true)
    try {
      const res = await api.post(`/bills/${id}/pay`, { mode: payMode })
      toast.success('Payment recorded')
      setBill(res.data.data)
      setPayModal(false)
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setPaying(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!bill) return <p className="text-center py-20 text-ink-faint">Bill not found</p>

  const billedMins = bill.session?.billed_minutes
  const startDT = bill.session?.start_time
  const endDT = bill.session?.end_time

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between no-print">
        <button className="btn-ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex gap-2">
          {bill.status === 'unpaid' && (
            <button id="pay-invoice-btn" className="btn-primary" onClick={() => { setPayMode('cash'); setPayModal(true) }}>
              <CreditCard className="h-4 w-4" /> Record Payment
            </button>
          )}
          <button className="btn-secondary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>
      </div>

      {/* Invoice Card */}
      <div className="card max-w-2xl mx-auto p-8" id="invoice-card">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="h-9 w-9 rounded-xl bg-accent flex items-center justify-center shadow-card">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-base font-bold text-ink">CyberCafe</p>
                <p className="text-xs text-ink-muted font-semibold tracking-wider uppercase">Manager Pro</p>
              </div>
            </div>
            <p className="text-xs text-ink-muted mt-2">Tax Invoice</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-mono font-bold text-ink">{bill.bill_no}</p>
            <p className="text-xs text-ink-muted mt-1">{formatDateTime(bill.created_at)}</p>
            <span className={`badge badge-${bill.status} mt-2 inline-flex`}>{bill.status.toUpperCase()}</span>
          </div>
        </div>

        <div className="neon-line mb-6" />

        {/* Customer & Staff */}
        <div className="grid grid-cols-2 gap-6 mb-7">
          <div>
            <p className="label mb-2">Customer</p>
            <p className="text-sm font-bold text-ink">{bill.customer?.name}</p>
            {bill.customer?.phone && <p className="text-sm text-ink-muted mt-0.5">{bill.customer.phone}</p>}
          </div>
          <div>
            <p className="label mb-2">Served By</p>
            <p className="text-sm font-bold text-ink">{bill.staff?.name}</p>
            <p className="text-sm text-ink-muted mt-0.5">{bill.station?.name} · {formatCurrency(bill.station?.hourly_rate)}/hr</p>
          </div>
        </div>

        {/* Session info */}
        <div className="bg-surface-raised border border-line rounded-xl p-4 mb-7">
          <p className="label mb-3">Session Details</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-ink-muted mb-0.5">Start</p>
              <p className="font-semibold text-ink">{formatDateTime(startDT)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted mb-0.5">End</p>
              <p className="font-semibold text-ink">{formatDateTime(endDT)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted mb-0.5">Duration</p>
              <p className="font-semibold text-ink">{formatDuration(billedMins)} <span className="text-ink-muted">({billedMins} min)</span></p>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <table className="w-full text-sm mb-7">
          <thead>
            <tr className="border-b border-line">
              <th className="text-left py-2.5 text-xs text-ink-muted font-semibold uppercase tracking-widest">Description</th>
              <th className="text-right py-2.5 text-xs text-ink-muted font-semibold uppercase tracking-widest">Qty</th>
              <th className="text-right py-2.5 text-xs text-ink-muted font-semibold uppercase tracking-widest">Unit</th>
              <th className="text-right py-2.5 text-xs text-ink-muted font-semibold uppercase tracking-widest">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            <tr>
              <td className="py-3.5 text-ink">
                {bill.station?.name} — Computer Time
                <span className="text-xs text-ink-muted ml-2">({billedMins} min @ {formatCurrency(bill.station?.hourly_rate)}/hr)</span>
              </td>
              <td className="py-3.5 text-right text-ink-muted">1</td>
              <td className="py-3.5 text-right text-ink-muted font-mono">{formatCurrency(bill.time_charge)}</td>
              <td className="py-3.5 text-right font-semibold text-ink font-mono">{formatCurrency(bill.time_charge)}</td>
            </tr>
            {bill.services?.map((s) => (
              <tr key={s.id}>
                <td className="py-3.5 text-ink">{s.name}</td>
                <td className="py-3.5 text-right text-ink-muted">{s.quantity}</td>
                <td className="py-3.5 text-right text-ink-muted font-mono">{formatCurrency(s.unit_price)}</td>
                <td className="py-3.5 text-right font-semibold text-ink font-mono">{formatCurrency(s.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t border-line pt-4 space-y-2 text-sm">
          <div className="flex justify-between text-ink-muted">
            <span>Subtotal</span>
            <span className="font-mono">{formatCurrency((bill.time_charge || 0) + (bill.service_charge || 0))}</span>
          </div>
          {bill.discount > 0 && (
            <div className="flex justify-between text-warning">
              <span>Discount</span>
              <span className="font-mono">−{formatCurrency(bill.discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t border-line pt-3 mt-2">
            <span className="text-ink">Total</span>
            <span className="text-success font-mono">{formatCurrency(bill.total)}</span>
          </div>
        </div>

        {/* Payments */}
        {bill.payments?.length > 0 && (
          <div className="mt-6 bg-success/10 border border-success/20 rounded-xl p-4">
            <p className="text-xs text-success font-bold uppercase tracking-widest mb-3">Payment(s) Received</p>
            {bill.payments.map((p, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-success/80">{p.mode?.toUpperCase()}</span>
                <span className="text-success font-semibold font-mono">{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="neon-line mt-8 mb-4" />
        <p className="text-center text-xs text-ink-muted">Thank you for visiting! 🙏 · CyberCafe Manager Pro</p>
      </div>

      {/* Pay Modal */}
      <Modal isOpen={payModal} onClose={() => setPayModal(false)} title="Record Payment" size="sm">
        <div className="space-y-4">
          <div className="bg-surface-raised border border-line rounded-xl p-4 flex justify-between items-center">
            <span className="text-sm text-ink-muted font-semibold">Amount Due</span>
            <span className="text-2xl font-bold text-success font-mono">{formatCurrency(bill.total)}</span>
          </div>
          <div>
            <label className="label">Payment Mode</label>
            <select className="input" value={payMode} onChange={(e) => setPayMode(e.target.value)}>
              {['cash', 'upi', 'card'].map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setPayModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handlePay} disabled={paying}>
              {paying ? <Spinner size="sm" /> : <CreditCard className="h-4 w-4" />}
              {paying ? 'Processing…' : 'Confirm Payment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
