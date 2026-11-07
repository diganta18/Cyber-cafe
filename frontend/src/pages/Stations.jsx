import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, apiError } from '../utils/format'
import Table from '../components/Table'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Spinner from '../components/Spinner'
import Button from '../components/Button'
import Select from '../components/Select'
import { Plus, Pencil, Wrench, Search, Monitor } from 'lucide-react'

const STATUS_OPTIONS = ['available', 'occupied', 'reserved', 'maintenance']
const TYPE_OPTIONS = ['PC', 'Gaming', 'Cabin']

export default function Stations({ toast }) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', type: 'PC', hourly_rate: '', status: 'available' })
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [actionTarget, setActionTarget] = useState(null)

  const fetchStations = useCallback(async () => {
    try {
      const res = await api.get('/stations')
      setStations(res.data.data)
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchStations()
    const interval = setInterval(fetchStations, 15000)
    return () => clearInterval(interval)
  }, [fetchStations])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', type: 'PC', hourly_rate: '', status: 'available' })
    setFormErrors({})
    setModal('create')
  }

  const openEdit = (station) => {
    setEditing(station)
    setForm({ name: station.name, type: station.type, hourly_rate: station.hourly_rate, status: station.status })
    setFormErrors({})
    setModal('edit')
  }

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!form.hourly_rate || isNaN(form.hourly_rate) || Number(form.hourly_rate) <= 0)
      errs.hourly_rate = 'Enter a valid hourly rate'
    return errs
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setFormErrors(errs); return }
    setSaving(true)
    try {
      const body = { ...form, hourly_rate: parseFloat(form.hourly_rate) }
      if (editing) {
        await api.put(`/stations/${editing.id}`, body)
        toast.success('Station updated')
      } else {
        await api.post('/stations', body)
        toast.success('Station created')
      }
      setModal(null)
      fetchStations()
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = (station) => {
    setActionTarget(station)
    setConfirmOpen(true)
  }

  const handleConfirm = async () => {
    const next = actionTarget.status === 'maintenance' ? 'available' : 'maintenance'
    try {
      await api.patch(`/stations/${actionTarget.id}/status`, { status: next })
      toast.success(`Station set to ${next}`)
      fetchStations()
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setConfirmOpen(false)
      setActionTarget(null)
    }
  }

  const filtered = stations.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || s.status === filter
    return matchSearch && matchFilter
  })

  const filterOptions = ['all', ...STATUS_OPTIONS]

  const columns = [
    {
      key: 'name', label: 'Station name',
      render: (val) => (
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-md bg-surface-raised border border-line flex items-center justify-center flex-shrink-0">
            <Monitor className="h-3.5 w-3.5 text-ink-faint" />
          </div>
          <span className="font-medium text-ink font-geist">{val}</span>
        </div>
      ),
    },
    {
      key: 'type', label: 'Type',
      render: (val) => <span className={`badge badge-${val}`}>{val}</span>,
    },
    {
      key: 'hourly_rate', label: 'Rate / hr',
      render: (val) => <span className="font-mono text-xs text-ink font-semibold">{formatCurrency(val)}</span>,
    },
    {
      key: 'status', label: 'Status',
      render: (val, row) => (
        <div>
          <span className={`badge badge-${val}`}>{val}</span>
          {row.upcoming_booking && (
            <span className="block text-[10px] text-[#EC7E00] font-extrabold mt-0.5 font-mono">
              #{row.upcoming_booking.booking_code}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'active_session', label: 'Current user',
      render: (val, row) => {
        if (val) return <span className="text-xs text-ink font-medium">{val.customer_name}</span>
        if (row.upcoming_booking) {
          return (
            <span className="text-xs text-[#EC7E00] font-bold">
              Reserved: {row.upcoming_booking.customer_name}
            </span>
          )
        }
        return <span className="text-ink-faint text-xs">—</span>
      },
    },
    ...(isAdmin ? [{
      key: 'id', label: '',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => openEdit(row)}
            className="btn-ghost py-1 px-2 text-xs"
            disabled={row.status === 'occupied'}
            aria-label={`Edit ${row.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {row.status !== 'occupied' && (
            <button
              onClick={() => handleToggleStatus(row)}
              className="btn-ghost py-1 px-2 text-xs"
              aria-label={`Toggle maintenance for ${row.name}`}
            >
              <Wrench className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ),
    }] : []),
  ]

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Stations</h1>
          <p className="text-xs text-ink-muted mt-1">{stations.length} hardware terminals configured</p>
        </div>
        {isAdmin && (
          <Button id="create-station-btn" size="sm" onClick={openCreate}>
            New station
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center justify-between">
        <div className="tab-group">
          {filterOptions.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`tab-item ${filter === s ? 'tab-item-active' : ''}`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="relative flex-shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none stroke-[2.2]" />
          <input
            type="text"
            placeholder="Search stations..."
            className="input pl-10 w-56 text-xs font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <Table columns={columns} data={filtered} loading={loading} emptyMessage="No stations match your filter." />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modal === 'create' || modal === 'edit'}
        onClose={() => setModal(null)}
        title={editing ? `Edit Station — ${editing.name}` : 'New Station'}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Station Name *</label>
            <input
              className={`input ${formErrors.name ? 'input-error' : ''}`}
              placeholder="e.g. PC-01"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              id="station-name-input"
            />
            {formErrors.name && <p className="error-text">{formErrors.name}</p>}
          </div>
          <div>
            <Select
              id="station-type-select"
              label="Type *"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              options={TYPE_OPTIONS.map((t) => ({ value: t, label: t }))}
            />
          </div>
          <div>
            <label className="label">Hourly Rate (₹) *</label>
            <input
              type="number" min="1" step="0.5"
              className={`input ${formErrors.hourly_rate ? 'input-error' : ''}`}
              placeholder="60"
              value={form.hourly_rate}
              onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
            />
            {formErrors.hourly_rate && <p className="error-text">{formErrors.hourly_rate}</p>}
          </div>
          {editing && (
            <div>
              <Select
                id="station-status-select"
                label="Status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                disabled={editing?.status === 'occupied'}
                options={STATUS_OPTIONS.filter(s => s !== 'occupied').map((s) => ({
                  value: s,
                  label: s.charAt(0).toUpperCase() + s.slice(1),
                }))}
              />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <Button id="save-station-btn" size="sm" onClick={handleSave} loading={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="Change Station Status"
        message={`Set "${actionTarget?.name}" to ${actionTarget?.status === 'maintenance' ? 'available' : 'maintenance'}?`}
        confirmLabel="Confirm"
      />
    </div>
  )
}
