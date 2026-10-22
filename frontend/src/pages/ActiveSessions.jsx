import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { formatCurrency, formatTimer, elapsedSeconds, apiError } from '../utils/format'
import Modal from '../components/Modal'
import Spinner from '../components/Spinner'
import { Plus, Trash2, StopCircle, RefreshCw, Clock, Zap, User } from 'lucide-react'

function LiveTimer({ startTime }) {
  const [secs, setSecs] = useState(() => elapsedSeconds(startTime))
  useEffect(() => {
    const id = setInterval(() => setSecs(elapsedSeconds(startTime)), 1000)
    return () => clearInterval(id)
  }, [startTime])
  return <span className="font-mono text-accent font-bold text-lg tabular-nums">{formatTimer(secs)}</span>
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
          <h1 className="page-title">Active Sessions</h1>
          <p className="text-sm text-ink-muted mt-0.5">{sessions.length} session{sessions.length !== 1 ? 's' : ''} live</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchSessions} className="btn-ghost" aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button id="start-session-btn" onClick={openStart} className="btn-primary">
            <Plus className="h-4 w-4" /> New Session
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : sessions.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="h-16 w-16 rounded-2xl bg-surface-raised border border-line flex items-center justify-center mx-auto mb-4">
            <Clock className="h-8 w-8 text-ink-muted" />
          </div>
          <p className="text-ink font-semibold mb-1">No active sessions</p>
          <p className="text-sm text-ink-muted mb-5">Start a session to get the clock running</p>
          <button onClick={openStart} className="btn-primary mx-auto">
            <Plus className="h-4 w-4" /> Start First Session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sessions.map((sess) => (
            <div key={sess.id} className="card p-5 flex flex-col gap-4 border-l-4 border-l-accent hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge badge-active text-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse mr-1" />
                      LIVE
                    </span>
                    <span className="text-xs font-semibold text-ink-muted">{sess.station_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-surface-raised border border-line flex items-center justify-center flex-shrink-0">
                      <User className="h-3.5 w-3.5 text-ink-muted" />
                    </div>
                    <p className="font-bold text-ink truncate">{sess.customer_name}</p>
                  </div>
                  {sess.customer_phone && <p className="text-xs text-ink-muted mt-0.5 ml-9">{sess.customer_phone}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <LiveTimer startTime={sess.start_time} />
                  <p className="text-xs text-ink-muted mt-0.5">{formatCurrency(sess.hourly_rate)}/hr</p>
                </div>
              </div>

              {/* Services */}
              {sess.services && sess.services.length > 0 && (
                <div className="bg-surface-raised border border-line rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-ink-muted uppercase tracking-widest mb-1.5">Services</p>
                  {sess.services.map((sv) => (
                    <div key={sv.id} className="flex items-center justify-between">
                      <span className="text-xs text-ink-muted">{sv.name} × {sv.quantity}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-ink">{formatCurrency(sv.line_total)}</span>
                        <button
                          onClick={() => handleRemoveService(sess.id, sv.id)}
                          className="text-ink-faint hover:text-danger transition-colors"
                          aria-label="Remove service"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={() => openAddService(sess)} className="btn-secondary flex-1 justify-center text-xs">
                  <Plus className="h-3.5 w-3.5" /> Add Service
                </button>
                <button id={`end-session-${sess.id}`} onClick={() => openEnd(sess)} className="btn-danger flex-1 justify-center text-xs">
                  <StopCircle className="h-3.5 w-3.5" /> End & Bill
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
            <label className="label">Customer *</label>
            <select
              className={`input ${startErrors.customer_id ? 'input-error' : ''}`}
              value={startForm.customer_id}
              onChange={(e) => setStartForm({ ...startForm, customer_id: e.target.value })}
              id="session-customer-select"
            >
              <option value="">Select customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.phone ? ` — ${c.phone}` : ''}</option>
              ))}
            </select>
            {startErrors.customer_id && <p className="error-text">{startErrors.customer_id}</p>}
          </div>
          <div>
            <label className="label">Station *</label>
            <select
              className={`input ${startErrors.station_id ? 'input-error' : ''}`}
              value={startForm.station_id}
              onChange={(e) => setStartForm({ ...startForm, station_id: e.target.value })}
              id="session-station-select"
            >
              <option value="">Select available station…</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.type}) — {formatCurrency(s.hourly_rate)}/hr</option>
              ))}
            </select>
            {startErrors.station_id && <p className="error-text">{startErrors.station_id}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setStartModal(false)}>Cancel</button>
            <button id="confirm-start-btn" className="btn-primary" onClick={handleStart} disabled={starting}>
              {starting ? <Spinner size="sm" /> : <Zap className="h-4 w-4" />}
              {starting ? 'Starting…' : 'Start Session'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Service Modal */}
      <Modal isOpen={!!serviceModal} onClose={() => setServiceModal(null)} title={`Add Service — ${serviceModal?.station_name}`} size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Service *</label>
            <select
              className={`input ${svcErrors.service_id ? 'input-error' : ''}`}
              value={svcForm.service_id}
              onChange={(e) => setSvcForm({ ...svcForm, service_id: e.target.value })}
            >
              <option value="">Select service…</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {formatCurrency(s.price)}
                  {s.track_stock ? ` (stock: ${s.stock_qty})` : ''}
                </option>
              ))}
            </select>
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
            <button className="btn-primary" onClick={handleAddService} disabled={addingSvc}>
              {addingSvc ? <Spinner size="sm" /> : null} Add
            </button>
          </div>
        </div>
      </Modal>

      {/* End Session Modal */}
      <Modal isOpen={!!endModal} onClose={() => setEndModal(null)} title={`End Session — ${endModal?.station_name}`} size="sm">
        <div className="space-y-4">
          <div className="bg-surface-raised border border-line rounded-xl p-4 space-y-2">
            {[
              { label: 'Customer', value: endModal?.customer_name },
              { label: 'Station',  value: endModal?.station_name },
              { label: 'Rate',     value: `${formatCurrency(endModal?.hourly_rate)}/hr` },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-xs text-ink-muted font-semibold uppercase tracking-wide">{label}</span>
                <span className="text-sm font-semibold text-ink">{value}</span>
              </div>
            ))}
          </div>
          <div>
            <label className="label">Discount (₹)</label>
            <input
              type="number" min="0" step="0.5"
              className="input"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              id="end-session-discount"
            />
            <p className="text-xs text-ink-muted mt-1.5">Leave 0 for no discount.</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setEndModal(null)}>Cancel</button>
            <button id="confirm-end-btn" className="btn-danger" onClick={handleEnd} disabled={ending}>
              {ending ? <Spinner size="sm" /> : <StopCircle className="h-4 w-4" />}
              {ending ? 'Processing…' : 'End & Generate Bill'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
