import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { formatCurrency, formatDateTime, formatDuration, apiError } from '../utils/format'
import { Printer, ArrowLeft, CreditCard, Wifi } from 'lucide-react'
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
  if (!bill) return <p className="text-center py-20 text-gray-400">Bill not found</p>

  const billedMins = bill.session?.billed_minutes
  const startDT = bill.session?.start_time
  const endDT = bill.session?.end_time

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 no-print">
        <button className="btn-ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex gap-2">
          {bill.status === 'unpaid' && (
            <button
              id="pay-invoice-btn"
              className="btn-primary"
              onClick={() => { setPayMode('cash'); setPayModal(true) }}
            >
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
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-primary-600 rounded-lg p-1.5">
                <Wifi className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">CyberCafe Manager</span>
            </div>
            <p className="text-xs text-gray-400">Tax Invoice</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-mono font-bold text-gray-900">{bill.bill_no}</p>
            <p className="text-xs text-gray-400 mt-1">{formatDateTime(bill.created_at)}</p>
            <span className={`badge badge-${bill.status} mt-2 inline-flex`}>{bill.status.toUpperCase()}</span>
          </div>
        </div>

        {/* Customer & Staff */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Customer</p>
            <p className="text-sm font-semibold text-gray-900">{bill.customer?.name}</p>
            {bill.customer?.phone && <p className="text-sm text-gray-500">{bill.customer.phone}</p>}
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Served By</p>
            <p className="text-sm font-semibold text-gray-900">{bill.staff?.name}</p>
            <p className="text-sm text-gray-500">{bill.station?.name} · {formatCurrency(bill.station?.hourly_rate)}/hr</p>
          </div>
        </div>

        {/* Session row */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-3">Session</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Start</p>
              <p className="font-medium">{formatDateTime(startDT)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">End</p>
              <p className="font-medium">{formatDateTime(endDT)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Billed Duration</p>
              <p className="font-medium">{formatDuration(billedMins)} ({billedMins} min)</p>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 text-xs text-gray-500 font-semibold uppercase">Description</th>
              <th className="text-right py-2 text-xs text-gray-500 font-semibold uppercase">Qty</th>
              <th className="text-right py-2 text-xs text-gray-500 font-semibold uppercase">Unit</th>
              <th className="text-right py-2 text-xs text-gray-500 font-semibold uppercase">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* Time charge row */}
            <tr>
              <td className="py-3 text-gray-800">
                {bill.station?.name} — Computer Time
                <span className="text-xs text-gray-400 ml-2">({billedMins} min @ {formatCurrency(bill.station?.hourly_rate)}/hr)</span>
              </td>
              <td className="py-3 text-right text-gray-600">1</td>
              <td className="py-3 text-right text-gray-600">{formatCurrency(bill.time_charge)}</td>
              <td className="py-3 text-right font-medium text-gray-900">{formatCurrency(bill.time_charge)}</td>
            </tr>
            {/* Service rows */}
            {bill.services?.map((s) => (
              <tr key={s.id}>
                <td className="py-3 text-gray-800">{s.name}</td>
                <td className="py-3 text-right text-gray-600">{s.quantity}</td>
                <td className="py-3 text-right text-gray-600">{formatCurrency(s.unit_price)}</td>
                <td className="py-3 text-right font-medium text-gray-900">{formatCurrency(s.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span>{formatCurrency((bill.time_charge || 0) + (bill.service_charge || 0))}</span>
          </div>
          {bill.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>−{formatCurrency(bill.discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-3 mt-2">
            <span className="text-gray-900">Total</span>
            <span className="text-gray-900">{formatCurrency(bill.total)}</span>
          </div>
        </div>

        {/* Payments */}
        {bill.payments?.length > 0 && (
          <div className="mt-6 bg-green-50 rounded-lg p-4">
            <p className="text-xs text-green-700 font-semibold uppercase tracking-wide mb-2">Payment(s) Received</p>
            {bill.payments.map((p, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-green-700">{p.mode?.toUpperCase()}</span>
                <span className="text-green-700 font-medium">{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-8">Thank you for visiting! 🙏</p>
      </div>

      {/* Pay Modal */}
      <Modal isOpen={payModal} onClose={() => setPayModal(false)} title="Record Payment" size="sm">
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 flex justify-between items-center">
            <span className="text-sm text-gray-500">Amount Due</span>
            <span className="text-xl font-bold text-gray-900">{formatCurrency(bill.total)}</span>
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
              {paying ? <Spinner size="sm" /> : null}
              {paying ? 'Processing…' : 'Confirm Payment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
