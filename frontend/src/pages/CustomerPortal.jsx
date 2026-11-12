import { useState, useEffect } from 'react'
import api from '../api/axios'
import { formatCurrency, formatDateTime } from '../utils/format'
import Button from '../components/Button'
import Spinner from '../components/Spinner'
import {
  Monitor, Gamepad2, Printer, Calendar, Clock, CheckCircle2,
  Upload, FileText, Search, ArrowRight, ShieldCheck, Sparkles, Phone, User
} from 'lucide-react'

export default function CustomerPortal({ toast }) {
  const [activeTab, setActiveTab] = useState('book') // 'book' | 'print' | 'track'

  // Booking states
  const [stations, setStations] = useState([])
  const [selectedStation, setSelectedStation] = useState(null)
  const [stationTypeFilter, setStationTypeFilter] = useState('all') // 'all' | 'Gaming' | 'PC'
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().slice(0, 10))
  const [availableSlots, setAvailableSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [durationMins, setDurationMins] = useState(60)
  const [bookCustomerName, setBookCustomerName] = useState('')
  const [bookCustomerPhone, setBookCustomerPhone] = useState('')
  const [bookNotes, setBookNotes] = useState('')
  const [submittingBooking, setSubmittingBooking] = useState(false)
  const [confirmedBooking, setConfirmedBooking] = useState(null)

  // Printout states
  const [printFile, setPrintFile] = useState(null)
  const [colorMode, setColorMode] = useState('bw')
  const [duplexMode, setDuplexMode] = useState('single')
  const [copies, setCopies] = useState(1)
  const [pageCount, setPageCount] = useState(1)
  const [printCustomerName, setPrintCustomerName] = useState('')
  const [printCustomerPhone, setPrintCustomerPhone] = useState('')
  const [printNotes, setPrintNotes] = useState('')
  const [submittingPrint, setSubmittingPrint] = useState(false)
  const [confirmedPrint, setConfirmedPrint] = useState(null)

  // Track states
  const [trackQuery, setTrackQuery] = useState('')
  const [trackResults, setTrackResults] = useState(null)
  const [trackingLoading, setTrackingLoading] = useState(false)

  // Initial load
  useEffect(() => {
    loadStations()
  }, [])

  const loadStations = async () => {
    try {
      const res = await api.get('/stations')
      setStations(res.data.data)
      if (res.data.data.length > 0) {
        setSelectedStation(res.data.data[0])
      }
    } catch {
      // ignore
    }
  }

  // Load available slots when station or date changes
  useEffect(() => {
    if (selectedStation) {
      loadSlots(selectedStation.id, bookingDate)
    }
  }, [selectedStation, bookingDate])

  const loadSlots = async (stationId, date) => {
    try {
      const res = await api.get(`/bookings/available-slots?station_id=${stationId}&date=${date}`)
      if (res.data.data.length > 0) {
        setAvailableSlots(res.data.data[0].slots)
      }
    } catch {
      setAvailableSlots([])
    }
  }

  const handleBookingSubmit = async (e) => {
    e.preventDefault()
    if (!selectedStation) {
      toast?.error('Please select a station')
      return
    }
    if (!selectedSlot) {
      toast?.error('Please select an available time slot')
      return
    }
    if (!bookCustomerName.trim() || !bookCustomerPhone.trim()) {
      toast?.error('Please enter your name and 10-digit mobile number')
      return
    }

    setSubmittingBooking(true)
    try {
      const res = await api.post('/bookings', {
        station_id: selectedStation.id,
        customer_name: bookCustomerName.trim(),
        customer_phone: bookCustomerPhone.trim(),
        start_time: selectedSlot.start_time,
        duration_mins: durationMins,
        status: 'pending',
        notes: bookNotes,
      })

      setConfirmedBooking(res.data.data)
      toast?.success('Booking request submitted! Awaiting staff confirmation.')
    } catch (err) {
      toast?.error(err.response?.data?.message || 'Failed to book slot. Please try another time.')
    } finally {
      setSubmittingBooking(false)
    }
  }

  // Calculate live printout estimate
  const unitRate = colorMode === 'color' ? 10.0 : 3.0
  const estimatedPrintCost = Math.round(pageCount * copies * unitRate * 100) / 100

  const handlePrintSubmit = async (e) => {
    e.preventDefault()
    if (!printFile) {
      toast?.error('Please select a document to upload')
      return
    }
    if (!printCustomerName.trim() || !printCustomerPhone.trim()) {
      toast?.error('Please enter your name and mobile number')
      return
    }

    setSubmittingPrint(true)
    try {
      const formData = new FormData()
      formData.append('file', printFile)
      formData.append('customer_name', printCustomerName.trim())
      formData.append('customer_phone', printCustomerPhone.trim())
      formData.append('color_mode', colorMode)
      formData.append('duplex_mode', duplexMode)
      formData.append('copies', copies)
      formData.append('page_count', pageCount)
      if (printNotes) formData.append('notes', printNotes)

      const res = await api.post('/print-orders', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setConfirmedPrint(res.data.data)
      toast?.success('Print job submitted successfully!')
    } catch (err) {
      toast?.error(err.response?.data?.message || 'Failed to upload print order.')
    } finally {
      setSubmittingPrint(false)
    }
  }

  const handleTrackSubmit = async (e) => {
    e.preventDefault()
    if (!trackQuery.trim()) return

    setTrackingLoading(true)
    try {
      const q = encodeURIComponent(trackQuery.trim())
      const [pSettled, bSettled] = await Promise.allSettled([
        api.get(`/print-orders/track?tracking_query=${q}`),
        api.get(`/bookings/track?query=${q}`),
      ])
      setTrackResults({
        printOrders: pSettled.status === 'fulfilled' ? pSettled.value.data?.data || [] : [],
        bookings: bSettled.status === 'fulfilled' ? bSettled.value.data?.data || [] : [],
      })
    } catch {
      setTrackResults({ printOrders: [], bookings: [] })
    } finally {
      setTrackingLoading(false)
    }
  }

  const filteredStations = stations.filter((s) => {
    if (stationTypeFilter === 'all') return true
    return s.type.toLowerCase() === stationTypeFilter.toLowerCase()
  })

  return (
    <div className="min-h-screen bg-[#F5F0D0] text-[#2A2407] font-sans selection:bg-[#EC7E00] selection:text-white">
      {/* Top Banner */}
      <header className="bg-[#2A2407] text-white border-b-4 border-[#EC7E00] py-4 px-4 sm:px-8 shadow-md">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-pricedown tracking-wide text-[#ECE4A9]">
              Cyber Café
            </h1>
            <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#EC7E00] text-white tracking-widest border border-white/20">
              Customer Portal
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Intro Hero */}
        <div className="bg-[#ECE4A9] border-2 border-[#2A2407] rounded-2xl p-5 sm:p-6 shadow-[4px_4px_0px_#2A2407]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#2A2407]">
                Self-Service & Express Orders
              </h2>
              <p className="text-xs sm:text-sm text-ink-muted mt-1 font-medium">
                Reserve gaming consoles & PCs in advance, or send printouts for instant takeaway pickup.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold bg-white px-3 py-1.5 rounded-xl border border-[#2A2407] shadow-[2px_2px_0px_#2A2407] self-start sm:self-auto">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Instant Confirmation</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-3 gap-2 mt-5">
            <button
              type="button"
              onClick={() => { setActiveTab('book'); setConfirmedBooking(null) }}
              className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-wider border-2 border-[#2A2407] flex items-center justify-center gap-2 transition-all ${
                activeTab === 'book'
                  ? 'bg-[#EC7E00] text-white shadow-[3px_3px_0px_#2A2407]'
                  : 'bg-white text-ink hover:bg-[#FAF7EB]'
              }`}
            >
              <Gamepad2 className="h-4 w-4" /> Book a Station
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('print'); setConfirmedPrint(null) }}
              className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-wider border-2 border-[#2A2407] flex items-center justify-center gap-2 transition-all ${
                activeTab === 'print'
                  ? 'bg-[#EC7E00] text-white shadow-[3px_3px_0px_#2A2407]'
                  : 'bg-white text-ink hover:bg-[#FAF7EB]'
              }`}
            >
              <Printer className="h-4 w-4" /> Print & Takeout
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('track')}
              className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-wider border-2 border-[#2A2407] flex items-center justify-center gap-2 transition-all ${
                activeTab === 'track'
                  ? 'bg-[#EC7E00] text-white shadow-[3px_3px_0px_#2A2407]'
                  : 'bg-white text-ink hover:bg-[#FAF7EB]'
              }`}
            >
              <Search className="h-4 w-4" /> Track Status
            </button>
          </div>
        </div>

        {/* TAB 1: BOOK A STATION */}
        {activeTab === 'book' && (
          <div className="space-y-6">
            {confirmedBooking ? (
              <div className="bg-white border-3 border-[#2A2407] rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-[6px_6px_0px_#2A2407] animate-fade-in">
                <div className="h-16 w-16 bg-amber-100 border-2 border-[#2A2407] rounded-full flex items-center justify-center mx-auto text-amber-700 shadow-[2px_2px_0px_#2A2407]">
                  <Clock className="h-9 w-9" />
                </div>
                <h3 className="text-2xl font-extrabold text-ink">Booking Request Submitted!</h3>
                <p className="text-xs text-ink-muted max-w-md mx-auto">
                  Your reservation request has been received. Our café desk staff will review and confirm your slot shortly.
                </p>

                {/* Big Code Card */}
                <div className="bg-[#FAF7EB] border-2 border-[#2A2407] rounded-xl p-4 max-w-sm mx-auto shadow-[3px_3px_0px_#2A2407]">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-ink-muted">Your Booking PIN Code</span>
                  <p className="text-4xl font-extrabold text-[#EC7E00] font-mono tracking-wider my-1">
                    {confirmedBooking.booking_code}
                  </p>
                  <p className="text-[11px] font-bold text-ink">
                    {confirmedBooking.station_name} ({confirmedBooking.station_type}) · {new Date(confirmedBooking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                    <Clock className="h-3 w-3" /> Awaiting Staff Approval
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 max-w-md mx-auto text-xs text-amber-900 text-left space-y-1">
                  <p className="font-bold">📋 What Happens Next:</p>
                  <p className="text-[11px]">
                    1. Counter staff verifies and confirms your terminal reservation.<br/>
                    2. Check <strong>Track Status</strong> tab anytime with PIN <strong>{confirmedBooking.booking_code}</strong>.<br/>
                    3. Arrive at the café within 15 minutes of your slot time to begin playing!
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={() => { setConfirmedBooking(null); setSelectedSlot(null) }}
                >
                  Book another slot
                </Button>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-6">
                {/* Step 1: Choose Type & Station */}
                <div className="bg-white border-2 border-[#2A2407] rounded-2xl p-5 shadow-[3px_3px_0px_#2A2407] space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-ink flex items-center gap-1.5">
                      <span className="h-5 w-5 bg-[#EC7E00] text-white rounded-full flex items-center justify-center text-xs">1</span>
                      Choose Your Rig / Station
                    </span>
                    <div className="flex gap-1">
                      {['all', 'Gaming', 'PC'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setStationTypeFilter(type)}
                          className={`px-2 py-0.5 text-xs font-bold rounded-lg border border-[#2A2407] ${
                            stationTypeFilter === type
                              ? 'bg-[#2A2407] text-white'
                              : 'bg-white text-ink hover:bg-[#FAF7EB]'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stations Horizontal Slider / Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {filteredStations.map((st) => {
                      const isSelected = selectedStation?.id === st.id
                      return (
                        <div
                          key={st.id}
                          onClick={() => { setSelectedStation(st); setSelectedSlot(null) }}
                          className={`p-3 rounded-xl border-2 border-[#2A2407] cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-[#EC7E00] text-white shadow-[3px_3px_0px_#2A2407] -translate-y-0.5'
                              : 'bg-[#FAF7EB] hover:bg-white shadow-[1px_1px_0px_#2A2407]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase opacity-80">{st.type}</span>
                            {st.type === 'Gaming' ? <Gamepad2 className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                          </div>
                          <p className="text-sm font-extrabold font-mono mt-1">{st.name}</p>
                          <p className={`text-xs font-bold font-mono mt-1 ${isSelected ? 'text-white' : 'text-[#EC7E00]'}`}>
                            {formatCurrency(st.hourly_rate)}/hr
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Step 2: Choose Date & Time Slot */}
                <div className="bg-white border-2 border-[#2A2407] rounded-2xl p-5 shadow-[3px_3px_0px_#2A2407] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-ink flex items-center gap-1.5">
                      <span className="h-5 w-5 bg-[#EC7E00] text-white rounded-full flex items-center justify-center text-xs">2</span>
                      Select Date & Available Time Slot
                    </span>
                    <input
                      type="date"
                      value={bookingDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => { setBookingDate(e.target.value); setSelectedSlot(null) }}
                      className="input py-1 px-2.5 text-xs font-mono font-bold w-auto"
                    />
                  </div>

                  {/* Slot pills */}
                  {availableSlots.length === 0 ? (
                    <div className="text-center py-6 text-xs text-ink-muted">
                      No slots available for this date.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {availableSlots.map((slot) => {
                        const isChosen = selectedSlot?.start_time === slot.start_time
                        return (
                          <button
                            key={slot.start_time}
                            type="button"
                            disabled={!slot.is_available}
                            onClick={() => setSelectedSlot(slot)}
                            className={`p-2.5 rounded-xl border text-xs font-bold font-mono transition-all ${
                              !slot.is_available
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                                : isChosen
                                ? 'bg-[#2A2407] text-[#F5F0D0] border-[#2A2407] shadow-[2px_2px_0px_#2A2407]'
                                : 'bg-[#FAF7EB] border-[#2A2407] text-ink hover:bg-[#ECE4A9] shadow-[1px_1px_0px_#2A2407]'
                            }`}
                          >
                            {slot.slot_label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Step 3: Customer Details */}
                <div className="bg-white border-2 border-[#2A2407] rounded-2xl p-5 shadow-[3px_3px_0px_#2A2407] space-y-4">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-ink flex items-center gap-1.5">
                    <span className="h-5 w-5 bg-[#EC7E00] text-white rounded-full flex items-center justify-center text-xs">3</span>
                    Your Contact Information
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Full Name *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. Rahul Sharma"
                          className="input pl-9"
                          value={bookCustomerName}
                          onChange={(e) => setBookCustomerName(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label">Mobile Number * (For 4-Digit Code)</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
                        <input
                          type="tel"
                          required
                          placeholder="10-digit number"
                          className="input pl-9"
                          value={bookCustomerPhone}
                          onChange={(e) => setBookCustomerPhone(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="label">Special Requests / Notes (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Need headphones, playing Valorant"
                      className="input"
                      value={bookNotes}
                      onChange={(e) => setBookNotes(e.target.value)}
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      className="w-full py-3 text-sm font-extrabold"
                      loading={submittingBooking}
                      disabled={!selectedSlot}
                    >
                      Request Station Reservation ({selectedSlot ? selectedSlot.slot_label : 'Select slot above'})
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: REMOTE PRINTOUT & TAKEOUT */}
        {activeTab === 'print' && (
          <div className="space-y-6">
            {confirmedPrint ? (
              <div className="bg-white border-3 border-[#2A2407] rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-[6px_6px_0px_#2A2407] animate-fade-in">
                <div className="h-16 w-16 bg-emerald-100 border-2 border-[#2A2407] rounded-full flex items-center justify-center mx-auto text-emerald-700 shadow-[2px_2px_0px_#2A2407]">
                  <CheckCircle2 className="h-9 w-9" />
                </div>
                <h3 className="text-2xl font-extrabold text-ink">Print Job Sent to Café!</h3>
                <p className="text-xs text-ink-muted max-w-md mx-auto">
                  Your document has been safely queued for printing. You can walk into the café anytime to collect your prints.
                </p>

                {/* Big Order Card */}
                <div className="bg-[#FAF7EB] border-2 border-[#2A2407] rounded-xl p-4 max-w-sm mx-auto shadow-[3px_3px_0px_#2A2407]">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-ink-muted">Pickup Order ID</span>
                  <p className="text-4xl font-extrabold text-[#EC7E00] font-mono tracking-wider my-1">
                    {confirmedPrint.order_no}
                  </p>
                  <p className="text-xs font-bold text-ink mt-1">
                    Total Estimated: {formatCurrency(confirmedPrint.estimated_cost)}
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 max-w-md mx-auto text-xs text-amber-900 text-left">
                  <p className="font-bold">🛍️ Takeaway Collection Instructions:</p>
                  <p className="text-[11px] mt-0.5">
                    Just tell the counter staff: <strong>"Print Order {confirmedPrint.order_no}"</strong>. Pay by Cash, UPI, or Card upon collection!
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={() => { setConfirmedPrint(null); setPrintFile(null) }}
                >
                  Send another document
                </Button>
              </div>
            ) : (
              <form onSubmit={handlePrintSubmit} className="space-y-6">
                {/* Step 1: Upload Document */}
                <div className="bg-white border-2 border-[#2A2407] rounded-2xl p-5 shadow-[3px_3px_0px_#2A2407] space-y-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-ink flex items-center gap-1.5">
                    <span className="h-5 w-5 bg-[#EC7E00] text-white rounded-full flex items-center justify-center text-xs">1</span>
                    Upload Document (PDF, Word, or Image)
                  </span>

                  <label className="border-2 border-dashed border-[#2A2407] bg-[#FAF7EB] rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-[#ECE4A9] transition-colors">
                    <Upload className="h-8 w-8 text-[#EC7E00] mb-2" />
                    {printFile ? (
                      <div className="text-center">
                        <p className="text-xs font-extrabold text-ink">{printFile.name}</p>
                        <p className="text-[10px] text-ink-muted mt-0.5">
                          {(printFile.size / 1024 / 1024).toFixed(2)} MB · Click to change file
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-xs font-extrabold text-ink">Click or tap to select document</p>
                        <p className="text-[10px] text-ink-muted mt-0.5">PDF, DOCX, DOC, JPG, PNG up to 25 MB</p>
                      </div>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) setPrintFile(e.target.files[0])
                      }}
                    />
                  </label>
                </div>

                {/* Step 2: Print Settings */}
                <div className="bg-white border-2 border-[#2A2407] rounded-2xl p-5 shadow-[3px_3px_0px_#2A2407] space-y-4">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-ink flex items-center gap-1.5">
                    <span className="h-5 w-5 bg-[#EC7E00] text-white rounded-full flex items-center justify-center text-xs">2</span>
                    Print Specifications & Live Price
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Color Mode */}
                    <div>
                      <label className="label">Print Color</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setColorMode('bw')}
                          className={`p-2.5 rounded-xl border-2 border-[#2A2407] text-xs font-bold transition-all ${
                            colorMode === 'bw'
                              ? 'bg-[#2A2407] text-[#F5F0D0] shadow-[2px_2px_0px_#2A2407]'
                              : 'bg-white text-ink hover:bg-[#FAF7EB]'
                          }`}
                        >
                          Black & White (₹3/pg)
                        </button>
                        <button
                          type="button"
                          onClick={() => setColorMode('color')}
                          className={`p-2.5 rounded-xl border-2 border-[#2A2407] text-xs font-bold transition-all ${
                            colorMode === 'color'
                              ? 'bg-[#EC7E00] text-white shadow-[2px_2px_0px_#2A2407]'
                              : 'bg-white text-ink hover:bg-[#FAF7EB]'
                          }`}
                        >
                          Full Color (₹10/pg)
                        </button>
                      </div>
                    </div>

                    {/* Sides */}
                    <div>
                      <label className="label">Sides</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setDuplexMode('single')}
                          className={`p-2.5 rounded-xl border-2 border-[#2A2407] text-xs font-bold transition-all ${
                            duplexMode === 'single'
                              ? 'bg-[#2A2407] text-[#F5F0D0] shadow-[2px_2px_0px_#2A2407]'
                              : 'bg-white text-ink hover:bg-[#FAF7EB]'
                          }`}
                        >
                          Single-Sided
                        </button>
                        <button
                          type="button"
                          onClick={() => setDuplexMode('double')}
                          className={`p-2.5 rounded-xl border-2 border-[#2A2407] text-xs font-bold transition-all ${
                            duplexMode === 'double'
                              ? 'bg-[#2A2407] text-[#F5F0D0] shadow-[2px_2px_0px_#2A2407]'
                              : 'bg-white text-ink hover:bg-[#FAF7EB]'
                          }`}
                        >
                          Double-Sided (Duplex)
                        </button>
                      </div>
                    </div>

                    {/* Copies & Pages */}
                    <div>
                      <label className="label">Number of Copies</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        className="input font-mono font-bold"
                        value={copies}
                        onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                      />
                    </div>
                    <div>
                      <label className="label">Total Pages in Document</label>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        className="input font-mono font-bold"
                        value={pageCount}
                        onChange={(e) => setPageCount(Math.max(1, parseInt(e.target.value) || 1))}
                      />
                    </div>
                  </div>

                  {/* Live Cost Box */}
                  <div className="bg-[#ECE4A9] border-2 border-[#2A2407] rounded-xl p-3 flex justify-between items-center shadow-[2px_2px_0px_#2A2407]">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Estimated Takeaway Total</span>
                      <p className="text-xs font-medium text-ink">
                        {pageCount} page(s) × {copies} copy/copies @ {formatCurrency(unitRate)}/pg
                      </p>
                    </div>
                    <span className="text-2xl font-extrabold text-[#EC7E00] font-mono">
                      {formatCurrency(estimatedPrintCost)}
                    </span>
                  </div>
                </div>

                {/* Step 3: Contact */}
                <div className="bg-white border-2 border-[#2A2407] rounded-2xl p-5 shadow-[3px_3px_0px_#2A2407] space-y-4">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-ink flex items-center gap-1.5">
                    <span className="h-5 w-5 bg-[#EC7E00] text-white rounded-full flex items-center justify-center text-xs">3</span>
                    Pickup Customer Details
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Your Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ananya"
                        className="input"
                        value={printCustomerName}
                        onChange={(e) => setPrintCustomerName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">Mobile Number *</label>
                      <input
                        type="tel"
                        required
                        placeholder="10-digit number"
                        className="input"
                        value={printCustomerPhone}
                        onChange={(e) => setPrintCustomerPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Special Instructions (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Only print pages 2 to 7, staple in corner"
                      className="input"
                      value={printNotes}
                      onChange={(e) => setPrintNotes(e.target.value)}
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      className="w-full py-3 text-sm font-extrabold"
                      loading={submittingPrint}
                      disabled={!printFile}
                    >
                      Send Document for Printing ({formatCurrency(estimatedPrintCost)})
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 3: TRACK STATUS */}
        {activeTab === 'track' && (
          <div className="bg-white border-2 border-[#2A2407] rounded-2xl p-6 shadow-[4px_4px_0px_#2A2407] space-y-5">
            <div>
              <h3 className="text-lg font-extrabold text-ink">Track Your Booking or Print Order</h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Enter your 4-digit booking PIN code (e.g. <strong>4821</strong> or <strong>BK-4821</strong>), Print Order ID (e.g. <strong>PR-1042</strong>), or your mobile number.
              </p>
            </div>

            <form onSubmit={handleTrackSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter 4-digit code (e.g. 4821), Order ID, or Phone..."
                className="input flex-1 font-medium text-xs"
                value={trackQuery}
                onChange={(e) => setTrackQuery(e.target.value)}
              />
              <Button type="submit" size="sm" loading={trackingLoading}>
                Track Status
              </Button>
            </form>

            {trackResults && (
              <div className="space-y-4 pt-3 border-t border-dashed border-[#2A2407]/30">
                {(!trackResults.bookings || trackResults.bookings.length === 0) &&
                (!trackResults.printOrders || trackResults.printOrders.length === 0) ? (
                  <p className="text-center text-xs text-ink-muted py-6">
                    No reservations or print orders found matching "{trackQuery}". Please verify your 4-digit code (e.g. 4821), order number, or phone number.
                  </p>
                ) : (
                  <>
                    {/* Station Bookings Found */}
                    {trackResults.bookings?.length > 0 && (
                      <div className="space-y-2.5">
                        <p className="text-xs font-extrabold uppercase tracking-wider text-ink flex items-center gap-1.5">
                          <Gamepad2 className="h-4 w-4 text-[#EC7E00]" /> Station Reservations ({trackResults.bookings.length})
                        </p>
                        {trackResults.bookings.map((b) => (
                          <div
                            key={b.id}
                            className="bg-[#FAF7EB] border-2 border-[#2A2407] rounded-xl p-4 shadow-[2px_2px_0px_#2A2407] space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-base font-extrabold font-mono text-[#EC7E00]">{b.booking_code}</span>
                                <span className="text-xs font-bold text-ink">· {b.station_name} ({b.station_type})</span>
                              </div>
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${
                                  b.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-900 border-yellow-400'
                                    : b.status === 'confirmed'
                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                                    : b.status === 'active'
                                    ? 'bg-[#EC7E00] text-white border-[#2A2407]'
                                    : b.status === 'completed'
                                    ? 'bg-green-100 text-green-900 border-green-400'
                                    : 'bg-red-100 text-red-900 border-red-300'
                                }`}
                              >
                                {b.status === 'pending'
                                  ? 'Pending Staff Approval'
                                  : b.status === 'confirmed'
                                  ? 'Confirmed (Ready)'
                                  : b.status.replace('_', ' ')}
                              </span>
                            </div>

                            {b.status === 'pending' && (
                              <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                                ⏳ Reservation request submitted. Waiting for café counter staff to confirm your slot.
                              </p>
                            )}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-ink-muted gap-1 pt-1.5 border-t border-dashed border-[#2A2407]/20">
                              <span>
                                Time Slot:{' '}
                                <strong className="text-ink font-mono">
                                  {new Date(b.start_time).toLocaleDateString()} ·{' '}
                                  {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} —{' '}
                                  {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </strong>{' '}
                                ({b.duration_mins} mins)
                              </span>
                              <span>
                                Name: <strong className="text-ink">{b.customer_name}</strong>
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Printout Orders Found */}
                    {trackResults.printOrders?.length > 0 && (
                      <div className="space-y-2.5 pt-2">
                        <p className="text-xs font-extrabold uppercase tracking-wider text-ink flex items-center gap-1.5">
                          <Printer className="h-4 w-4 text-[#EC7E00]" /> Printout Orders ({trackResults.printOrders.length})
                        </p>
                        {trackResults.printOrders.map((r) => (
                          <div
                            key={r.id}
                            className="bg-[#FAF7EB] border-2 border-[#2A2407] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[2px_2px_0px_#2A2407]"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-base font-mono text-ink">{r.order_no}</span>
                                <span
                                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${
                                    r.status === 'ready'
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
                                      : r.status === 'printing'
                                      ? 'bg-blue-100 text-blue-800 border-blue-400'
                                      : r.status === 'completed'
                                      ? 'bg-green-100 text-green-900 border-green-400'
                                      : 'bg-yellow-100 text-yellow-800 border-yellow-400'
                                  }`}
                                >
                                  {r.status === 'ready' ? 'Ready for Pickup!' : r.status}
                                </span>
                              </div>
                              <p className="text-xs text-ink-muted mt-1 font-medium">
                                {r.file_name} · {r.copies} copy/copies ({r.color_mode.toUpperCase()})
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-bold text-ink-muted uppercase">Amount Due at Counter</span>
                              <p className="text-base font-extrabold text-[#EC7E00] font-mono">
                                {formatCurrency(r.estimated_cost)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

