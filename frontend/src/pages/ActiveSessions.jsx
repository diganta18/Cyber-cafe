import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { formatCurrency, formatTimer, elapsedSeconds, apiError } from '../utils/format'
import Modal from '../components/Modal'
import Spinner from '../components/Spinner'
import Button from '../components/Button'
import Select from '../components/Select'
import CounterSaleModal from '../components/CounterSaleModal'
import { Plus, Trash2, StopCircle, RefreshCw, Clock, Zap, User, ShoppingBag } from 'lucide-react'

function LiveTimer({ startTime }) {
  const [secs, setSecs] = useState(() => elapsedSeconds(startTime))
  useEffect(() => {
    const id = setInterval(() => setSecs(elapsedSeconds(startTime)), 1000)
    return () => clearInterval(id)
  }, [startTime])
  return <span className="font-mono text-ink font-semibold text-lg tabular-nums tracking-tight">{formatTimer(secs)}</span>
}

export default function ActiveSessions({ toast }) {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  const [startModal, setStartModal] = useState(false)
  const [customers, setCustomers] = useState([])
  const [stations, setStations] = useState([])
  const [startForm, setStartForm] = useState({ customer_id: '', station_id: '' })
  const [startErrors, setStartErrors] = useState({})
  const [starting, setStarting] = useState(false)
  const [counterModal, setCounterModal] = useState(false)

  const [serviceModal, setServiceModal] = useState(null)
  const [services, setServices] = useState([])
  const [svcForm, setSvcForm] = useState({ service_id: '', quantity: 1 })
  const [svcErrors, setSvcErrors] = useState({})
  const [addingSvc, setAddingSvc] = useState(false)

  const [endModal, setEndModal] = useState(null)
  const [discount, setDiscount] = useState('0')
  const [ending, setEnding] = useState(false)

  const fetchSessions = useCallback(async () => {
    try {
      const res = await api.get('/sessions/active')
      setSessions(res.data.data.items)
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchSessions()
    const id = setInterval(fetchSessions, 15000)
    return () => clearInterval(id)
  }, [fetchSessions])

  const openStart = async () => {
    try {
      const [custRes, stRes] = await Promise.all([
        api.get('/customers?limit=200'),
        api.get('/stations'),
      ])
      setCustomers(custRes.data.data.items)
      setStations(stRes.data.data.filter((s) => s.status === 'available'))
    } catch { /* ignore */ }
    setStartForm({ customer_id: '', station_id: '' })
    setStartErrors({})
    setStartModal(true)
  }

  const handleStart = async () => {
    const errs = {}
    if (!startForm.customer_id) errs.customer_id = 'Select a customer'
    if (!startForm.station_id) errs.station_id = 'Select a station'
    if (Object.keys(errs).length) { setStartErrors(errs); return }
    setStarting(true)
    try {
      await api.post('/sessions', startForm)
      toast.success('Session started')
      setStartModal(false)
      fetchSessions()
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setStarting(false)
    }
  }

  const openAddService = async (session) => {
    try {
      const res = await api.get('/services?limit=100')
      setServices(res.data.data.filter(s => s.is_active))
    } catch { /* ignore */ }
    setSvcForm({ service_id: '', quantity: 1 })
    setSvcErrors({})
    setServiceModal(session)
  }

  const handleAddService = async () => {
    const errs = {}
    if (!svcForm.service_id) errs.service_id = 'Select a service'
    if (!svcForm.quantity || svcForm.quantity < 1) errs.quantity = 'Quantity must be ≥ 1'
    if (Object.keys(errs).length) { setSvcErrors(errs); return }
    setAddingSvc(true)
    try {
      await api.post(`/sessions/${serviceModal.id}/services`, {
        service_id: parseInt(svcForm.service_id),
        quantity: parseInt(svcForm.quantity),
      })
      toast.success('Service added')
      setServiceModal(null)
      fetchSessions()
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setAddingSvc(false)
    }
  }

  const openEnd = (session) => {
    setDiscount('0')
    setEndModal(session)
  }

  const handleEnd = async () => {
    setEnding(true)
    try {
      const res = await api.post(`/sessions/${endModal.id}/end`, {
        discount: parseFloat(discount) || 0,
      })
      toast.success('Session ended — bill created')
      setEndModal(null)
      fetchSessions()
      navigate(`/bills/${res.data.data.id}`)
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setEnding(false)
    }
  }

  const handleRemoveService = async (sessionId, rowId) => {
    try {
      await api.delete(`/sessions/${sessionId}/services/${rowId}`)
      toast.success('Service removed')
      fetchSessions()
    } catch (err) {
      toast.error(apiError(err))
    }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Active sessions</h1>
          <p className="text-xs text-ink-muted mt-1">
            {sessions.length} active session{sessions.length !== 1 ? 's' : ''} currently running
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchSessions} className="btn-dark" aria-label="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-xs font-bold">Refresh</span>
          </button>
          <Button id="quick-counter-btn" variant="secondary" size="sm" onClick={() => setCounterModal(true)}>
            <ShoppingBag className="h-4 w-4 mr-1.5" /> Quick counter sale
          </Button>
          <Button id="start-session-btn" size="sm" onClick={openStart}>
            New session
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : sessions.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="h-12 w-12 rounded-xl bg-surface-raised border border-line flex items-center justify-center mx-auto mb-3">
            <Clock className="h-5 w-5 text-ink-faint" />
          </div>
          <p className="text-sm font-semibold text-ink mb-1 font-geist">No active sessions</p>
          <p className="text-xs text-ink-muted mb-4">Start a session to allocate a station to a customer</p>
          <Button size="sm" onClick={openStart} className="mx-auto">
            Start session
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sessions.map((sess) => (
            <div key={sess.id} className="card p-5 flex flex-col justify-between hover:border-ink/20 transition-colors duration-150">
              {/* Header */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#EC7E00]/15 text-[#EC7E00] border-2 border-[#EC7E00]">
                      <span className="h-2 w-2 rounded-full bg-accent" />
                      Live
                    </span>
                    <span className="text-xs font-bold text-ink">{sess.station_name}</span>
                  </div>
                  <LiveTimer startTime={sess.start_time} />
                </div>

                <div className="flex items-center gap-2.5 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-[#ECE4A9] border-2 border-[#2A2407] shadow-[1px_1px_0px_#2A2407] flex items-center justify-center flex-shrink-0 text-ink font-bold text-xs">
                    {sess.customer_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink truncate font-geist">{sess.customer_name}</p>
                    <p className="text-xs text-ink-muted font-medium">{sess.customer_phone || `${formatCurrency(sess.hourly_rate)}/hr`}</p>
                  </div>
                </div>

                {/* Services */}
                {sess.services && sess.services.length > 0 && (
                  <div className="mt-3 bg-[#ECE4A9] border-2 border-[#2A2407] rounded-xl p-3 space-y-1.5 shadow-[2px_2px_0px_#2A2407]">
                    <p className="text-[11px] font-bold text-ink uppercase tracking-wide">Add-ons</p>
                    {sess.services.map((sv) => (
                      <div key={sv.id} className="flex items-center justify-between text-xs font-medium">
                        <span className="text-ink">{sv.name} × {sv.quantity}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink">{formatCurrency(sv.line_total)}</span>
                          <button
                            onClick={() => handleRemoveService(sess.id, sv.id)}
                            className="text-ink-faint hover:text-danger p-0.5"
                            aria-label="Remove service"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4 pt-3 border-t border-line">
                <button onClick={() => openAddService(sess)} className="btn-secondary flex-1 justify-center text-xs py-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add service
                </button>
                <button id={`end-session-${sess.id}`} onClick={() => openEnd(sess)} className="btn-danger flex-1 justify-center text-xs py-1.5">
                  <StopCircle className="h-3.5 w-3.5" /> End & bill
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Start Session Modal */}
      <Modal isOpen={startModal} onClose={() => setStartModal(false)} title="Start New Session" size="sm">
        <div className="space-y-4">
          <div>
            <Select
              id="session-customer-select"
              label="Customer *"
              value={startForm.customer_id}
              onChange={(e) => setStartForm({ ...startForm, customer_id: e.target.value })}
              options={customers.map((c) => ({
                value: c.id,
                label: `${c.name}${c.phone ? ` — ${c.phone}` : ''}`,
              }))}
              placeholder="Select customer…"
              error={!!startErrors.customer_id}
            />
            {startErrors.customer_id && <p className="error-text">{startErrors.customer_id}</p>}
          </div>
          <div>
            <Select
              id="session-station-select"
              label="Station *"
              value={startForm.station_id}
              onChange={(e) => setStartForm({ ...startForm, station_id: e.target.value })}
              options={stations.map((s) => ({
                value: s.id,
                label: `${s.name} (${s.type}) — ${formatCurrency(s.hourly_rate)}/hr`,
              }))}
              placeholder="Select available station…"
              error={!!startErrors.station_id}
            />
            {startErrors.station_id && <p className="error-text">{startErrors.station_id}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setStartModal(false)}>Cancel</button>
            <Button id="confirm-start-btn" size="sm" onClick={handleStart} loading={starting}>
              {starting ? 'Starting…' : 'Start Session'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Service Modal */}
      <Modal isOpen={!!serviceModal} onClose={() => setServiceModal(null)} title={`Add Service — ${serviceModal?.station_name}`} size="sm">
        <div className="space-y-4">
          <div>
            <Select
              id="session-service-select"
              label="Service *"
              value={svcForm.service_id}
              onChange={(e) => setSvcForm({ ...svcForm, service_id: e.target.value })}
              options={services.map((s) => ({
                value: s.id,
                label: `${s.name} — ${formatCurrency(s.price)}${s.track_stock ? ` (stock: ${s.stock_qty})` : ''}`,
              }))}
              placeholder="Select service…"
              error={!!svcErrors.service_id}
            />
            {svcErrors.service_id && <p className="error-text">{svcErrors.service_id}</p>}
          </div>
          <div>
            <label className="label">Quantity *</label>
            <input
              type="number" min="1"
              className={`input ${svcErrors.quantity ? 'input-error' : ''}`}
              value={svcForm.quantity}
              onChange={(e) => setSvcForm({ ...svcForm, quantity: e.target.value })}
            />
            {svcErrors.quantity && <p className="error-text">{svcErrors.quantity}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setServiceModal(null)}>Cancel</button>
            <Button size="sm" onClick={handleAddService} loading={addingSvc}>
              {addingSvc ? 'Adding…' : 'Add'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* End Session Modal */}
      <Modal isOpen={!!endModal} onClose={() => setEndModal(null)} title={`End Session — ${endModal?.station_name}`} size="sm">
        {(() => {
          const timeCharge = parseFloat(endModal?.running_time_charge) || 0;
          const serviceCharge = parseFloat(endModal?.running_service_charge) || 0;
          const subtotal = Math.round((timeCharge + serviceCharge) * 100) / 100;
          const discVal = Math.max(0, parseFloat(discount) || 0);
          const finalTotal = Math.max(0, Math.round((subtotal - discVal) * 100) / 100);

          return (
            <div className="space-y-4">
              <div className="bg-surface-raised border border-line rounded-xl p-4 space-y-2">
                {[
                  { label: 'Customer', value: endModal?.customer_name },
                  { label: 'Station',  value: endModal?.station_name },
                  { label: 'Hourly Rate', value: `${formatCurrency(endModal?.hourly_rate)}/hr` },
                  { label: 'Time charge', value: formatCurrency(timeCharge) },
                  ...(serviceCharge > 0 ? [{ label: 'Snacks & Prints', value: formatCurrency(serviceCharge) }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center text-xs">
                    <span className="text-ink-muted font-semibold uppercase tracking-wide">{label}</span>
                    <span className="font-semibold text-ink">{value}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-dashed border-[#2A2407]/30 flex justify-between items-center">
                  <span className="text-xs font-bold text-ink uppercase tracking-wider">Subtotal</span>
                  <span className="text-sm font-bold font-mono text-ink">{formatCurrency(subtotal)}</span>
                </div>
              </div>

              <div>
                <label className="label">Discount (₹)</label>
                <input
                  type="number" min="0" step="0.5"
                  className="input"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  id="end-session-discount"
                  placeholder="0.00"
                />
                <p className="text-xs text-ink-muted mt-1.5">Leave 0 for no discount.</p>
              </div>

              {/* Live Final Total Preview */}
              <div className="p-3 bg-[#FAF7EB] border-2 border-[#2A2407] rounded-xl flex items-center justify-between shadow-[2px_2px_0px_#2A2407]">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Final Bill Amount</span>
                  <p className="text-xs text-ink-faint">After ₹{discVal.toFixed(2)} discount</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-extrabold text-[#EC7E00] font-mono">{formatCurrency(finalTotal)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button className="btn-secondary" onClick={() => setEndModal(null)}>Cancel</button>
                <Button id="confirm-end-btn" variant="danger" size="sm" onClick={handleEnd} loading={ending}>
                  {ending ? 'Processing…' : 'End & Generate Bill'}
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Quick Counter Sale Modal */}
      <CounterSaleModal
        isOpen={counterModal}
        onClose={() => setCounterModal(false)}
        onSuccess={(bill) => {
          fetchSessions()
          if (bill?.id) navigate(`/bills/${bill.id}`)
        }}
        toast={toast}
      />
    </div>
  )
}
