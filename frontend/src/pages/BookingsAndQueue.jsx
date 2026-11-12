import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { formatCurrency, formatDateTime, apiError } from '../utils/format'
import Button from '../components/Button'
import Modal from '../components/Modal'
import Select from '../components/Select'
import Spinner from '../components/Spinner'
import {
  Calendar, Printer, CheckCircle2, Clock, XCircle, Download,
  ExternalLink, UserCheck, Plus, RefreshCw, AlertCircle, FileText
} from 'lucide-react'

export default function BookingsAndQueue({ toast }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('bookings') // 'bookings' | 'prints'
  const [loading, setLoading] = useState(true)

  // Bookings state
  const [bookings, setBookings] = useState([])
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().slice(0, 10))
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all')
  const [actionLoading, setActionLoading] = useState(null)
  const [totalPendingBookings, setTotalPendingBookings] = useState(0)

  // Print orders state
  const [printOrders, setPrintOrders] = useState([])
  const [printStatusFilter, setPrintStatusFilter] = useState('all')
  const [refreshing, setRefreshing] = useState(false)

  // New Booking Modal
  const [createModal, setCreateModal] = useState(false)
  const [stations, setStations] = useState([])
  const [customers, setCustomers] = useState([])
  const [newBooking, setNewBooking] = useState({
    station_id: '',
    customer_id: '',
    customer_name: '',
    customer_phone: '',
    date: new Date().toISOString().slice(0, 10),
    time: '14:00',
    duration_mins: 60,
    status: 'confirmed',
    notes: '',
  })
  const [submittingBooking, setSubmittingBooking] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const dateParam = bookingDate ? `date=${bookingDate}&` : ''
      const statusParam = bookingStatusFilter !== 'all' ? `status=${bookingStatusFilter}` : ''
      const bookingQuery = `?${dateParam}${statusParam}`.replace(/&$/, '').replace(/\?$/, '')

      const [bRes, pRes, pendingRes] = await Promise.all([
        api.get(`/bookings${bookingQuery}`),
        api.get(`/print-orders${printStatusFilter !== 'all' ? `?status=${printStatusFilter}` : ''}`),
        api.get('/bookings?status=pending'),
      ])
      setBookings(bRes.data.data)
      setPrintOrders(pRes.data.data)
      setTotalPendingBookings(pendingRes.data?.data?.length || 0)
    } catch (err) {
      toast?.error(apiError(err))
    } finally {
      setLoading(false)
    }
  }, [bookingDate, bookingStatusFilter, printStatusFilter, toast])

  // Load once on mount or when filter changes (NO automatic interval timer)
  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleManualRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
    toast?.success('Refreshed orders and reservations')
  }

  const openCreateBooking = async () => {
    try {
      const [stRes, custRes] = await Promise.all([
        api.get('/stations'),
        api.get('/customers?limit=200'),
      ])
      setStations(stRes.data.data)
      setCustomers(custRes.data.data.items || [])
      setNewBooking({
        station_id: stRes.data.data[0]?.id || '',
        customer_id: '',
        customer_name: '',
        customer_phone: '',
        date: new Date().toISOString().slice(0, 10),
        time: '14:00',
        duration_mins: 60,
        status: 'confirmed',
        notes: '',
      })
      setCreateModal(true)
    } catch {
      toast?.error('Failed to prepare booking form')
    }
  }

  const handleCreateBooking = async () => {
    if (!newBooking.station_id) {
      toast?.error('Please select a station')
      return
    }
    if (!newBooking.customer_id && (!newBooking.customer_name || !newBooking.customer_phone)) {
      toast?.error('Please select customer or enter customer name & phone')
      return
    }

    setSubmittingBooking(true)
    try {
      const startTime = `${newBooking.date} ${newBooking.time}:00`
      await api.post('/bookings', {
        station_id: parseInt(newBooking.station_id),
        customer_id: newBooking.customer_id ? parseInt(newBooking.customer_id) : undefined,
        customer_name: newBooking.customer_name || undefined,
        customer_phone: newBooking.customer_phone || undefined,
        start_time: startTime,
        duration_mins: parseInt(newBooking.duration_mins) || 60,
        status: newBooking.status || 'confirmed',
        notes: newBooking.notes,
      })

      toast?.success(newBooking.status === 'confirmed' ? 'Reservation confirmed!' : 'Reservation request recorded!')
      setCreateModal(false)
      fetchData()
    } catch (err) {
      toast?.error(apiError(err))
    } finally {
      setSubmittingBooking(false)
    }
  }

  const handleUpdateBookingStatus = async (id, nextStatus) => {
    setActionLoading(id)
    try {
      await api.patch(`/bookings/${id}/status`, { status: nextStatus })
      toast?.success(`Booking ${nextStatus === 'confirmed' ? 'confirmed' : 'updated'}!`)
      fetchData()
    } catch (err) {
      toast?.error(apiError(err))
    } finally {
      setActionLoading(null)
    }
  }

  const handleCheckin = async (id) => {
    setActionLoading(id)
    try {
      const res = await api.post(`/bookings/${id}/checkin`)
      toast?.success(res.data.data?.message || 'Customer checked in!')
      fetchData()
      navigate('/sessions')
    } catch (err) {
      toast?.error(apiError(err))
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancelBooking = async (id) => {
    if (!window.confirm('Cancel this reservation? Station will be released immediately.')) return
    setActionLoading(id)
    try {
      await api.post(`/bookings/${id}/cancel`)
      toast?.success('Booking cancelled')
      fetchData()
    } catch (err) {
      toast?.error(apiError(err))
    } finally {
      setActionLoading(null)
    }
  }

  const handleUpdatePrintStatus = async (id, nextStatus) => {
    setActionLoading(id)
    try {
      const res = await api.patch(`/print-orders/${id}/status`, { status: nextStatus })
      toast?.success(`Order marked as ${nextStatus}`)
      fetchData()
      if (nextStatus === 'completed' && res.data.data?.bill_id) {
        navigate(`/bills/${res.data.data.bill_id}`)
      }
    } catch (err) {
      toast?.error(apiError(err))
    } finally {
      setActionLoading(null)
    }
  }

  const handleDownloadFile = (id) => {
    window.open(`${api.defaults.baseURL || '/api'}/print-orders/${id}/download`, '_blank')
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-900 border-yellow-400 font-extrabold'
      case 'confirmed':
        return 'bg-blue-100 text-blue-900 border-blue-400'
      case 'active':
        return 'bg-[#EC7E00] text-white border-[#2A2407]'
      case 'completed':
        return 'bg-green-100 text-green-900 border-green-400'
      case 'no_show':
        return 'bg-red-100 text-red-900 border-red-300'
      case 'cancelled':
        return 'bg-gray-100 text-gray-700 border-gray-300'
      case 'printing':
        return 'bg-blue-100 text-blue-900 border-blue-400'
      case 'ready':
        return 'bg-emerald-100 text-emerald-900 border-emerald-400'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Bookings & remote orders</h1>
          <p className="text-xs text-ink-muted mt-1">
            Manage advance station reservations and remote printout orders
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'bookings' && (
            <Button id="new-booking-btn" size="sm" onClick={openCreateBooking}>
              <Plus className="h-4 w-4 mr-1.5" /> New reservation
            </Button>
          )}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh bookings and orders"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-[#EC7E00]' : ''}`} />
            <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex gap-2 border-b-2 border-[#2A2407] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('bookings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider border-2 border-[#2A2407] transition-all ${
            activeTab === 'bookings'
              ? 'bg-[#EC7E00] text-white shadow-[3px_3px_0px_#2A2407]'
              : 'bg-white text-ink hover:bg-[#ECE4A9]'
          }`}
        >
          <Calendar className="h-4 w-4" /> Station reservations ({bookings.length})
          {totalPendingBookings > 0 && (
            <span className="bg-amber-300 text-[#2A2407] px-2 py-0.5 rounded-full text-[10px] font-black border border-[#2A2407] animate-pulse">
              {totalPendingBookings} PENDING
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('prints')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider border-2 border-[#2A2407] transition-all ${
            activeTab === 'prints'
              ? 'bg-[#EC7E00] text-white shadow-[3px_3px_0px_#2A2407]'
              : 'bg-white text-ink hover:bg-[#ECE4A9]'
          }`}
        >
          <Printer className="h-4 w-4" /> Print orders queue ({printOrders.filter((p) => p.status !== 'completed').length} active)
        </button>
      </div>

      {/* TAB 1: BOOKINGS */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {/* Pending Requests Banner */}
          {totalPendingBookings > 0 && (
            <div className="bg-amber-100 border-2 border-[#2A2407] rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[3px_3px_0px_#2A2407]">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-800 shrink-0 animate-bounce" />
                <div>
                  <p className="text-xs font-black text-amber-950 uppercase tracking-wider">
                    {totalPendingBookings} Pending Reservation Request{totalPendingBookings > 1 ? 's' : ''} Awaiting Approval
                  </p>
                  <p className="text-[11px] text-amber-900 font-medium">
                    Customer submitted slot request(s) via the portal. Approve to confirm slot, or Decline to release terminal.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setBookingStatusFilter('pending'); setBookingDate('') }}
                className="btn-primary py-1.5 px-3.5 text-xs bg-[#2A2407] text-[#F5F0D0] whitespace-nowrap cursor-pointer hover:bg-black font-extrabold"
              >
                Review Pending ({totalPendingBookings})
              </button>
            </div>
          )}

          {/* Filters Bar */}
          <div className="bg-[#FAF7EB] border-2 border-[#2A2407] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-[2px_2px_0px_#2A2407]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-ink uppercase tracking-wider">Date:</span>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="input py-1 px-2 text-xs font-mono font-bold"
              />
              <button
                type="button"
                onClick={() => setBookingDate(new Date().toISOString().slice(0, 10))}
                className={`px-2 py-1 text-xs font-bold rounded border border-[#2A2407] ${
                  bookingDate === new Date().toISOString().slice(0, 10)
                    ? 'bg-[#2A2407] text-white'
                    : 'bg-white hover:bg-[#ECE4A9]'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setBookingDate('')}
                className={`px-2 py-1 text-xs font-bold rounded border border-[#2A2407] ${
                  bookingDate === '' ? 'bg-[#2A2407] text-white' : 'bg-white hover:bg-[#ECE4A9]'
                }`}
              >
                All Dates
              </button>
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {['all', 'pending', 'confirmed', 'active', 'completed', 'no_show', 'cancelled'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setBookingStatusFilter(st)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-bold border border-[#2A2407] transition-all flex items-center gap-1 ${
                    bookingStatusFilter === st
                      ? 'bg-[#2A2407] text-[#F5F0D0]'
                      : 'bg-white text-ink hover:bg-[#ECE4A9]'
                  }`}
                >
                  <span>{st.replace('_', ' ').toUpperCase()}</span>
                  {st === 'pending' && bookings.filter((b) => b.status === 'pending').length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-ink text-[9px] font-black">
                      {bookings.filter((b) => b.status === 'pending').length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Bookings List / Grid */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Spinner size="lg" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="card text-center py-16">
              <Calendar className="h-10 w-10 text-ink-faint mx-auto mb-2" />
              <p className="text-sm font-bold text-ink">No reservations found for {bookingDate}</p>
              <p className="text-xs text-ink-muted mt-1">Click "New reservation" to book a slot for a walk-in or phone customer.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="bg-white border-2 border-[#2A2407] rounded-2xl p-4 flex flex-col justify-between shadow-[3px_3px_0px_#2A2407] hover:shadow-[4px_4px_0px_#2A2407] transition-all"
                >
                  <div>
                    {/* Top Row: Station + Booking Code */}
                    <div className="flex items-center justify-between pb-2 border-b border-dashed border-[#2A2407]/30">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Terminal</span>
                        <p className="text-base font-extrabold text-ink font-mono">{b.station_name} ({b.station_type})</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-ink-muted">Code</span>
                        <p className="text-sm font-extrabold bg-[#ECE4A9] px-2 py-0.5 rounded border border-[#2A2407] text-ink font-mono">
                          {b.booking_code}
                        </p>
                      </div>
                    </div>

                    {/* Time Window */}
                    <div className="my-3 bg-[#FAF7EB] p-2.5 rounded-xl border border-[#2A2407]/40 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-muted flex items-center gap-1 font-medium">
                          <Clock className="h-3.5 w-3.5 text-[#EC7E00]" /> Slot:
                        </span>
                        <span className="font-bold text-ink font-mono">
                          {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} —{' '}
                          {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-muted">Duration:</span>
                        <span className="font-semibold text-ink">{b.duration_mins} mins</span>
                      </div>
                    </div>

                    {/* Customer */}
                    <div className="space-y-0.5 text-xs">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Reserved For</p>
                      <p className="font-extrabold text-ink">{b.customer_name}</p>
                      <p className="text-ink-muted font-mono">{b.customer_phone}</p>
                    </div>

                    {b.notes && (
                      <p className="text-[11px] text-ink-muted bg-yellow-50 p-1.5 rounded border border-yellow-200 mt-2 italic">
                        "{b.notes}"
                      </p>
                    )}
                  </div>

                  {/* Footer & Actions */}
                  <div className="pt-3 border-t border-dashed border-[#2A2407]/30 mt-3 flex items-center justify-between">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${getStatusBadge(b.status)}`}>
                      {b.status.replace('_', ' ')}
                    </span>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {b.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdateBookingStatus(b.id, 'confirmed')}
                            disabled={actionLoading === b.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border-2 border-[#2A2407] bg-[#16A34A] text-white shadow-[2px_2px_0px_#2A2407] hover:bg-[#15803D] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#2A2407] transition-all cursor-pointer disabled:opacity-50"
                            title="Confirm & Approve Reservation"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 stroke-[2.5]" />
                            <span>{actionLoading === b.id ? 'Approving…' : 'Approve'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCheckin(b.id)}
                            disabled={actionLoading === b.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border-2 border-[#2A2407] bg-white text-[#2A2407] shadow-[2px_2px_0px_#2A2407] hover:bg-[#ECE4A9] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#2A2407] transition-all cursor-pointer disabled:opacity-50"
                            title="Directly check in & start session"
                          >
                            <UserCheck className="h-3.5 w-3.5 shrink-0 stroke-[2.5]" />
                            <span>{actionLoading === b.id ? 'Starting…' : 'Check-in'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelBooking(b.id)}
                            disabled={actionLoading === b.id}
                            className="inline-flex items-center justify-center p-1.5 rounded-xl border-2 border-[#2A2407] bg-white hover:bg-red-50 text-red-600 hover:text-red-800 shadow-[2px_2px_0px_#2A2407] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#2A2407] transition-all cursor-pointer disabled:opacity-50"
                            title="Decline reservation"
                          >
                            <XCircle className="h-4 w-4 stroke-[2.5]" />
                          </button>
                        </>
                      )}
                      {b.status === 'confirmed' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCheckin(b.id)}
                            disabled={actionLoading === b.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border-2 border-[#2A2407] bg-[#EC7E00] text-white shadow-[2px_2px_0px_#2A2407] hover:bg-[#D46F00] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#2A2407] transition-all cursor-pointer disabled:opacity-50"
                            title="Start live session"
                          >
                            <UserCheck className="h-3.5 w-3.5 shrink-0 stroke-[2.5]" />
                            <span>{actionLoading === b.id ? 'Starting…' : 'Check-in'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelBooking(b.id)}
                            disabled={actionLoading === b.id}
                            className="inline-flex items-center justify-center p-1.5 rounded-xl border-2 border-[#2A2407] bg-white hover:bg-red-50 text-red-600 hover:text-red-800 shadow-[2px_2px_0px_#2A2407] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#2A2407] transition-all cursor-pointer disabled:opacity-50"
                            title="Cancel booking"
                          >
                            <XCircle className="h-4 w-4 stroke-[2.5]" />
                          </button>
                        </>
                      )}
                      {b.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => navigate('/sessions')}
                          className="text-xs font-bold text-[#EC7E00] hover:underline flex items-center gap-1"
                        >
                          View Session <ExternalLink className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PRINT ORDERS */}
      {activeTab === 'prints' && (
        <div className="space-y-4">
          {/* Status Filter */}
          <div className="bg-[#FAF7EB] border-2 border-[#2A2407] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-[2px_2px_0px_#2A2407]">
            <span className="text-xs font-bold text-ink uppercase tracking-wider">Queue status:</span>
            <div className="flex gap-1.5 flex-wrap">
              {['all', 'pending', 'printing', 'ready', 'completed', 'cancelled'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setPrintStatusFilter(st)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-bold border border-[#2A2407] transition-all ${
                    printStatusFilter === st
                      ? 'bg-[#2A2407] text-[#F5F0D0]'
                      : 'bg-white text-ink hover:bg-[#ECE4A9]'
                  }`}
                >
                  {st.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Print Orders List */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Spinner size="lg" />
            </div>
          ) : printOrders.length === 0 ? (
            <div className="card text-center py-16">
              <Printer className="h-10 w-10 text-ink-faint mx-auto mb-2" />
              <p className="text-sm font-bold text-ink">No printout orders in queue</p>
              <p className="text-xs text-ink-muted mt-1">Customers can upload documents for takeaway on the Customer Portal (/portal).</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {printOrders.map((p) => (
                <div
                  key={p.id}
                  className="bg-white border-2 border-[#2A2407] rounded-2xl p-4 flex flex-col justify-between shadow-[3px_3px_0px_#2A2407] hover:shadow-[4px_4px_0px_#2A2407] transition-all"
                >
                  <div>
                    {/* Top Row: Order ID + Time */}
                    <div className="flex items-center justify-between pb-2 border-b border-dashed border-[#2A2407]/30">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Order ID</span>
                        <p className="text-base font-extrabold text-ink font-mono">{p.order_no}</p>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${getStatusBadge(p.status)}`}>
                        {p.status}
                      </span>
                    </div>

                    {/* Document details */}
                    <div className="my-3 bg-[#FAF7EB] p-3 rounded-xl border border-[#2A2407]/40 space-y-1.5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-1.5 min-w-0 pr-2">
                          <FileText className="h-4 w-4 text-[#EC7E00] flex-shrink-0" />
                          <p className="text-xs font-bold text-ink truncate" title={p.file_name}>{p.file_name}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDownloadFile(p.id)}
                          className="px-2 py-1 text-[11px] font-bold rounded border border-[#2A2407] bg-white hover:bg-[#ECE4A9] flex items-center gap-1 flex-shrink-0"
                          title="Download document to print"
                        >
                          <Download className="h-3 w-3" /> Get file
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dashed border-[#2A2407]/20 text-[11px]">
                        <div>
                          <span className="text-ink-muted">Mode: </span>
                          <span className="font-bold uppercase text-ink">{p.color_mode} · {p.duplex_mode}</span>
                        </div>
                        <div>
                          <span className="text-ink-muted">Copies: </span>
                          <span className="font-bold text-ink">{p.copies} (est. {p.page_count} pgs)</span>
                        </div>
                      </div>
                    </div>

                    {/* Customer & Cost */}
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-ink">{p.customer_name}</p>
                        <p className="text-[11px] text-ink-muted font-mono">{p.customer_phone}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-ink-muted uppercase tracking-wider">Estimated Total</span>
                        <p className="text-sm font-extrabold text-[#EC7E00] font-mono">{formatCurrency(p.estimated_cost)}</p>
                      </div>
                    </div>

                    {p.notes && (
                      <p className="text-[11px] text-ink-muted bg-yellow-50 p-1.5 rounded border border-yellow-200 mt-2 italic">
                        "{p.notes}"
                      </p>
                    )}
                  </div>

                  {/* Status Action Buttons */}
                  <div className="pt-3 border-t border-dashed border-[#2A2407]/30 mt-3">
                    {p.status === 'pending' && (
                      <Button
                        size="sm"
                        showArrows={false}
                        className="w-full"
                        onClick={() => handleUpdatePrintStatus(p.id, 'printing')}
                        loading={actionLoading === p.id}
                      >
                        Start printing
                      </Button>
                    )}
                    {p.status === 'printing' && (
                      <Button
                        size="sm"
                        showArrows={false}
                        className="w-full"
                        onClick={() => handleUpdatePrintStatus(p.id, 'ready')}
                        loading={actionLoading === p.id}
                        icon={CheckCircle2}
                      >
                        Mark ready for pickup
                      </Button>
                    )}
                    {p.status === 'ready' && (
                      <Button
                        size="sm"
                        showArrows={false}
                        className="w-full"
                        onClick={() => handleUpdatePrintStatus(p.id, 'completed')}
                        loading={actionLoading === p.id}
                      >
                        Collect payment & complete
                      </Button>
                    )}
                    {p.status === 'completed' && p.bill_id && (
                      <button
                        type="button"
                        onClick={() => navigate(`/bills/${p.bill_id}`)}
                        className="w-full py-1 text-xs font-bold text-center text-[#EC7E00] hover:underline flex items-center justify-center gap-1"
                      >
                        View Tax Invoice <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Reservation Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="New Station Reservation" size="md">
        <div className="space-y-4">
          <div>
            <Select
              id="new-booking-station"
              label="Station / Terminal *"
              value={newBooking.station_id}
              onChange={(e) => setNewBooking({ ...newBooking, station_id: e.target.value })}
              options={stations.map((s) => ({
                value: s.id,
                label: `${s.name} (${s.type}) — ${formatCurrency(s.hourly_rate)}/hr`,
              }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date *</label>
              <input
                type="date"
                className="input"
                value={newBooking.date}
                onChange={(e) => setNewBooking({ ...newBooking, date: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Start Time *</label>
              <input
                type="time"
                className="input"
                value={newBooking.time}
                onChange={(e) => setNewBooking({ ...newBooking, time: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label">Duration</label>
            <Select
              id="new-booking-duration"
              value={newBooking.duration_mins}
              onChange={(e) => setNewBooking({ ...newBooking, duration_mins: e.target.value })}
              options={[
                { value: '30', label: '30 Minutes' },
                { value: '60', label: '1 Hour (Recommended)' },
                { value: '90', label: '1.5 Hours' },
                { value: '120', label: '2 Hours' },
                { value: '180', label: '3 Hours' },
              ]}
            />
          </div>

          <div className="pt-2 border-t border-dashed border-[#2A2407]/30">
            <label className="label">Customer</label>
            <Select
              id="new-booking-customer"
              value={newBooking.customer_id}
              onChange={(e) => setNewBooking({ ...newBooking, customer_id: e.target.value })}
              options={[
                { value: '', label: '-- Or enter new phone / name below --' },
                ...customers.map((c) => ({ value: c.id, label: `${c.name} (${c.phone || ''})` })),
              ]}
            />
          </div>

          {!newBooking.customer_id && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Customer Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alex"
                  className="input"
                  value={newBooking.customer_name}
                  onChange={(e) => setNewBooking({ ...newBooking, customer_name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Customer Phone</label>
                <input
                  type="text"
                  placeholder="10-digit number"
                  className="input"
                  value={newBooking.customer_phone}
                  onChange={(e) => setNewBooking({ ...newBooking, customer_phone: e.target.value })}
                />
              </div>
            </div>
          )}

          <div>
            <label className="label">Reservation Status</label>
            <Select
              id="new-booking-status"
              value={newBooking.status || 'confirmed'}
              onChange={(e) => setNewBooking({ ...newBooking, status: e.target.value })}
              options={[
                { value: 'confirmed', label: 'Confirmed (Direct Booking)' },
                { value: 'pending', label: 'Pending Approval' },
              ]}
            />
          </div>

          <div>
            <label className="label">Special Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Needs FIFA installed"
              className="input"
              value={newBooking.notes}
              onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button type="button" className="btn-secondary" onClick={() => setCreateModal(false)}>
              Cancel
            </button>
            <Button size="sm" onClick={handleCreateBooking} loading={submittingBooking}>
              Confirm Reservation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

