import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { formatCurrency, formatDateTime, formatDuration, apiError } from '../utils/format'
import { Printer, ArrowLeft, CreditCard } from 'lucide-react'
import Spinner from '../components/Spinner'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Select from '../components/Select'

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
  const subtotal = (bill.time_charge || 0) + (bill.service_charge || 0)

  // Status badge styling in thermal stamp style
  const statusStamp = {
    paid:   'border-accent text-accent bg-accent/10',
    unpaid: 'border-danger text-danger bg-danger/10',
    void:   'border-ink-faint text-ink-faint bg-black/5',
  }[bill.status] || 'border-ink text-ink'

  return (
    <div className="space-y-6 pb-12">
      {/* Toolbar */}
      <div className="flex items-center justify-between no-print max-w-lg mx-auto">
        <button className="btn-ghost text-xs" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back to bills
        </button>
        <div className="flex gap-2">
          {bill.status === 'unpaid' && (
            <Button id="pay-invoice-btn" size="sm" onClick={() => { setPayMode('cash'); setPayModal(true) }}>
              Record payment
            </Button>
          )}
          <button className="btn-secondary text-xs" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" /> Print receipt
          </button>
        </div>
      </div>

      {/* Actual Thermal Receipt Container */}
      <div className="max-w-lg mx-auto" id="invoice-card">
        <div className="bg-[#FAF7EB] text-[#24221C] border border-[#E4DECA] border-b-0 rounded-t-xl p-6 sm:p-8 font-mono text-xs shadow-[0_10px_30px_-5px_rgba(40,35,25,0.08),0_1px_3px_rgba(0,0,0,0.05)] transition-all">

          {/* Star Header Border */}
          <div className="text-center text-[#9E9885] tracking-widest text-[11px] select-none overflow-hidden truncate">
            ************************************************************
          </div>

          <div className="text-center my-2">
            <p className="text-[13px] font-bold tracking-[0.3em] uppercase text-[#24221C]">RECEIPT</p>
          </div>

          <div className="text-center text-[#9E9885] tracking-widest text-[11px] select-none overflow-hidden truncate mb-4">
            ************************************************************
          </div>

          {/* Company Brand Header */}
          <div className="text-center space-y-1 mb-4">
            <h1 className="text-xl font-bold font-geist tracking-tight text-[#1A1813]">Cyber Café</h1>
            <p className="text-[11px] text-[#8C8674]">Tax Invoice</p>
          </div>

          {/* Bill Meta & Status Stamp */}
          <div className="flex items-center justify-between py-2 border-t border-b border-dashed border-[#D8D2BD] my-4 text-[11px]">
            <div>
              <p className="font-bold text-[#1A1813] text-sm tracking-tight">{bill.bill_no}</p>
              <p className="text-[#6E6959] mt-0.5">{formatDateTime(bill.created_at)}</p>
            </div>
            <div className={`border-2 border-dashed px-2.5 py-1 rounded text-xs font-bold tracking-wider uppercase ${statusStamp}`}>
              {bill.status}
            </div>
          </div>

          {/* Customer & Served By Grid */}
          <div className="grid grid-cols-2 gap-4 py-3 border-b border-dashed border-[#D8D2BD] text-[11px]">
            <div>
              <p className="text-[#8C8674] uppercase text-[10px] tracking-wider mb-0.5">Customer</p>
              <p className="font-bold text-[#1A1813]">{bill.customer?.name || 'Walk-in Customer'}</p>
              {bill.customer?.phone && <p className="text-[#6E6959]">{bill.customer.phone}</p>}
            </div>
            <div className="text-right">
              <p className="text-[#8C8674] uppercase text-[10px] tracking-wider mb-0.5">Served by</p>
              <p className="font-bold text-[#1A1813]">{bill.staff?.name || 'Counter Staff'}</p>
              <p className="text-[#6E6959]">
                {bill.station?.name}
                {bill.station?.hourly_rate > 0 && ` · ${formatCurrency(bill.station?.hourly_rate)}/hr`}
              </p>
            </div>
          </div>

          {/* Session Details Box or Counter Order Badge */}
          {bill.session && bill.time_charge > 0 ? (
            <div className="my-4 py-3 px-3.5 bg-[#F2EEDD]/70 rounded border border-dashed border-[#DDD6C0] text-[11px] space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#736E5E] mb-1">Session details</p>
              <div className="flex justify-between">
                <span className="text-[#6E6959]">Start:</span>
                <span className="font-semibold text-[#1A1813]">{formatDateTime(startDT)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6E6959]">End:</span>
                <span className="font-semibold text-[#1A1813]">{formatDateTime(endDT)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-dashed border-[#DDD6C0]">
                <span className="text-[#6E6959]">Duration:</span>
                <span className="font-bold text-[#1A1813]">{formatDuration(billedMins)} <span className="font-normal text-[#736E5E]">({billedMins} min)</span></span>
              </div>
            </div>
          ) : (
            <div className="my-4 py-2.5 px-3.5 bg-[#F2EEDD]/70 rounded border border-dashed border-[#DDD6C0] text-[11px] flex justify-between items-center">
              <span className="text-[#6E6959]">Order Type:</span>
              <span className="font-bold text-[#1A1813] uppercase tracking-wider">
                {bill.order_type === 'remote_print' ? 'Remote Printout (Takeaway)' : 'Counter / Takeaway Sale'}
              </span>
            </div>
          )}

          {/* Line Items Table */}
          <div className="my-4">
            <div className="flex justify-between text-[10px] text-[#8C8674] font-bold uppercase tracking-wider pb-1.5 border-b border-dashed border-[#D8D2BD]">
              <span className="flex-1">Description</span>
              <span className="w-10 text-center">Qty</span>
              <span className="w-16 text-right">Unit</span>
              <span className="w-16 text-right">Amount</span>
            </div>

            <div className="divide-y divide-dashed divide-[#E2DCC9] py-1 text-[11px]">
              {/* Computer Session Time (only if time charge > 0) */}
              {bill.time_charge > 0 && (
                <div className="py-2 flex justify-between items-start">
                  <div className="flex-1 pr-2">
                    <p className="font-semibold text-[#1A1813] leading-snug">{bill.station?.name} — Computer Time</p>
                    <p className="text-[10px] text-[#736E5E] mt-0.5">({billedMins} min @ {formatCurrency(bill.station?.hourly_rate)}/hr)</p>
                  </div>
                  <span className="w-10 text-center text-[#6E6959]">1</span>
                  <span className="w-16 text-right text-[#6E6959]">{formatCurrency(bill.time_charge)}</span>
                  <span className="w-16 text-right font-bold text-[#1A1813]">{formatCurrency(bill.time_charge)}</span>
                </div>
              )}

              {/* Add-on Services */}
              {bill.services?.map((s) => (
                <div key={s.id} className="py-2 flex justify-between items-start">
                  <div className="flex-1 pr-2">
                    <p className="font-semibold text-[#1A1813] leading-snug">{s.name}</p>
                  </div>
                  <span className="w-10 text-center text-[#6E6959]">{s.quantity}</span>
                  <span className="w-16 text-right text-[#6E6959]">{formatCurrency(s.unit_price)}</span>
                  <span className="w-16 text-right font-bold text-[#1A1813]">{formatCurrency(s.line_total)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Totals */}
          <div className="border-t-2 border-dashed border-[#D8D2BD] pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-[#6E6959]">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            {bill.discount > 0 && (
              <div className="flex justify-between text-[#B45309] font-medium">
                <span>Discount</span>
                <span>−{formatCurrency(bill.discount)}</span>
              </div>
            )}

            <div className="flex justify-between items-baseline pt-2 mt-1 border-t border-dashed border-[#D8D2BD] text-base font-bold text-[#1A1813]">
              <span className="tracking-wider">TOTAL</span>
              <span className="text-lg font-geist">{formatCurrency(bill.total)}</span>
            </div>
          </div>

          {/* Payment Details */}
          {bill.payments?.length > 0 && (
            <div className="mt-4 pt-3 border-t border-dashed border-[#D8D2BD] text-[11px] space-y-1">
              <p className="text-[10px] uppercase font-bold tracking-wider text-[#8C8674] mb-1.5">Payment recorded</p>
              {bill.payments.map((p, i) => (
                <div key={i} className="flex justify-between font-semibold text-[#1A1813]">
                  <span className="uppercase text-[#595444]">{p.mode}</span>
                  <span>{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Thank You Note */}
          <div className="text-center pt-6 pb-2 space-y-1">
            <p className="font-bold tracking-widest uppercase text-xs text-[#1A1813]">THANK YOU</p>
            <p className="text-[10px] text-[#787260]">Thank you for visiting · Cyber Café</p>
          </div>

          {/* Star Footer Border */}
          <div className="text-center text-[#9E9885] tracking-widest text-[11px] select-none overflow-hidden truncate mt-2 mb-4">
            ************************************************************
          </div>

          {/* Realistic Receipt Barcode Graphic */}
          <div className="pt-1 text-center">
            <div className="flex justify-center items-center gap-[2px] h-9 py-1 opacity-80 select-none">
              {[3, 1, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 4, 1, 3, 2, 1, 3, 2, 4, 1, 2, 1, 3, 1, 2, 1, 4].map((w, i) => (
                <div key={i} className="bg-[#24221C] h-full" style={{ width: `${w}px` }} />
              ))}
            </div>
            <p className="text-[10px] text-[#8C8674] tracking-[0.2em] mt-1">{bill.bill_no}</p>
          </div>

        </div>

        {/* Perforated / Jagged Receipt Tear Edge (Pure SVG Teeth) */}
        <div className="relative w-full h-3 overflow-hidden leading-none select-none">
          <svg
            viewBox="0 0 100 8"
            preserveAspectRatio="none"
            className="w-full h-full fill-[#FAF7EB] drop-shadow-[0_2px_1px_rgba(0,0,0,0.04)]"
          >
            <polygon points="
              0,0 2.5,8 5,0 7.5,8 10,0 12.5,8 15,0 17.5,8 20,0 22.5,8 25,0 27.5,8 30,0 32.5,8 35,0 37.5,8 40,0 42.5,8 45,0 47.5,8
              50,0 52.5,8 55,0 57.5,8 60,0 62.5,8 65,0 67.5,8 70,0 72.5,8 75,0 77.5,8 80,0 82.5,8 85,0 87.5,8 90,0 92.5,8 95,0 97.5,8 100,0
              100,0 0,0
            " />
          </svg>
        </div>
      </div>

      {/* Pay Modal */}
      <Modal isOpen={payModal} onClose={() => setPayModal(false)} title="Record Payment" size="sm">
        <div className="space-y-4">
          <div className="bg-[#ECE4A9] border-2 border-[#2A2407] rounded-xl p-4 flex justify-between items-center shadow-[2px_2px_0px_#2A2407]">
            <span className="text-sm text-ink font-bold uppercase tracking-wider">Amount Due</span>
            <span className="text-2xl font-extrabold text-accent font-mono">{formatCurrency(bill.total)}</span>
          </div>
          <div>
            <Select
              id="invoice-payment-mode"
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
            <button className="btn-secondary" onClick={() => setPayModal(false)}>Cancel</button>
            <Button size="sm" onClick={handlePay} loading={paying}>
              {paying ? 'Processing…' : 'Confirm Payment'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
