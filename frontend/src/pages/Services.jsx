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
import { Plus, Pencil, ToggleLeft, ToggleRight, Search, Package, AlertTriangle } from 'lucide-react'

export default function Services({ toast }) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', price: '', category: 'print', unit: 'page', track_stock: false, stock_qty: '' })
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const [confirmTarget, setConfirmTarget] = useState(null)

  const CATEGORIES = ['print', 'food', 'drink', 'stationery', 'other']

  const fetchServices = useCallback(async () => {
    try {
      const res = await api.get('/services')
      setServices(res.data.data)
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchServices() }, [fetchServices])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', price: '', category: 'print', unit: 'page', track_stock: false, stock_qty: '' })
    setFormErrors({})
    setModal('form')
  }

  const openEdit = (s) => {
    setEditing(s)
    setForm({ name: s.name, price: s.price, category: s.category, unit: s.unit, track_stock: !!s.track_stock, stock_qty: s.stock_qty ?? '' })
    setFormErrors({})
    setModal('form')
  }

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name required'
    if (!form.price || isNaN(form.price) || Number(form.price) <= 0) errs.price = 'Valid price required'
    if (form.track_stock && (form.stock_qty === '' || Number(form.stock_qty) < 0)) errs.stock_qty = 'Stock qty required'
    return errs
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setFormErrors(errs); return }
    setSaving(true)
    try {
      const body = { ...form, price: parseFloat(form.price), stock_qty: form.track_stock ? parseInt(form.stock_qty) : null }
      if (editing) {
        await api.put(`/services/${editing.id}`, body)
        toast.success('Service updated')
      } else {
        await api.post('/services', body)
        toast.success('Service created')
      }
      setModal(null)
      fetchServices()
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async () => {
    try {
      if (confirmTarget.is_active) {
        await api.delete(`/services/${confirmTarget.id}`)
      } else {
        await api.put(`/services/${confirmTarget.id}`, { is_active: 1 })
      }
      toast.success(`Service ${confirmTarget.is_active ? 'deactivated' : 'activated'}`)
      fetchServices()
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setConfirmTarget(null)
    }
  }

  const filtered = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    {
      key: 'name', label: 'Service name',
      render: (val) => (
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-md bg-surface-raised border border-line flex items-center justify-center flex-shrink-0">
            <Package className="h-3.5 w-3.5 text-ink-muted" />
          </div>
          <span className="font-medium text-ink font-geist">{val}</span>
        </div>
      ),
    },
    {
      key: 'category', label: 'Category',
      render: (val) => <span className="badge badge-PC capitalize">{val}</span>,
    },
    { key: 'unit', label: 'Unit', render: (val) => <span className="text-ink-muted text-xs">{val}</span> },
    {
      key: 'price', label: 'Price',
      render: (val) => <span className="font-medium text-ink font-mono text-xs">{formatCurrency(val)}</span>,
    },
    {
      key: 'track_stock', label: 'Stock',
      render: (val, row) => {
        if (!val && row.stock_qty === null) {
          return <span className="text-ink-faint text-xs">Unlimited</span>
        }
        const threshold = row.low_stock_threshold ?? 5
        const isLow = row.stock_qty !== null && row.stock_qty <= threshold
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`font-mono text-xs font-bold ${isLow ? 'text-red-600' : 'text-ink'}`}>
              {row.stock_qty}
            </span>
            {isLow && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-red-100 text-red-700 border border-red-300">
                <AlertTriangle className="h-2.5 w-2.5" /> Low
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'is_active', label: 'Status',
      render: (val) => val
        ? <span className="badge badge-available">Active</span>
        : <span className="badge badge-void">Inactive</span>,
    },
    ...(isAdmin ? [{
      key: 'id', label: '',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={() => openEdit(row)} className="btn-ghost py-1 px-2 text-xs" aria-label={`Edit ${row.name}`}>
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setConfirmTarget(row)} className="btn-ghost py-1 px-2 text-xs" aria-label={row.is_active ? 'Deactivate' : 'Activate'}>
            {row.is_active
              ? <ToggleRight className="h-5 w-5 text-accent" />
              : <ToggleLeft className="h-5 w-5 text-ink-faint" />}
          </button>
        </div>
      ),
    }] : []),
  ]

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Services & stock</h1>
          <p className="text-xs text-ink-muted mt-1">{services.length} items configured</p>
        </div>
        {isAdmin && (
          <Button id="create-service-btn" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5 inline-block" /> New service
          </Button>
        )}
      </div>

      <div className="relative w-64">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none stroke-[2.2]" />
        <input
          className="input pl-10 text-xs font-medium"
          placeholder="Search services…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card">
        <Table columns={columns} data={filtered} loading={loading} emptyMessage="No services found." />
      </div>

      <Modal isOpen={modal === 'form'} onClose={() => setModal(null)} title={editing ? 'Edit Service' : 'New Service'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Service Name *</label>
            <input className={`input ${formErrors.name ? 'input-error' : ''}`} placeholder="e.g. Print B/W" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} id="service-name-input" />
            {formErrors.name && <p className="error-text">{formErrors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Select
                id="service-category-select"
                label="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                options={CATEGORIES.map((c) => ({
                  value: c,
                  label: c.charAt(0).toUpperCase() + c.slice(1),
                }))}
              />
            </div>
            <div>
              <label className="label">Unit</label>
              <input className="input" placeholder="page / cup / item" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Price (₹) *</label>
            <input type="number" min="0" step="0.5" className={`input ${formErrors.price ? 'input-error' : ''}`} placeholder="5.00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            {formErrors.price && <p className="error-text">{formErrors.price}</p>}
          </div>
          <div className="flex items-center gap-3 py-1">
            <input type="checkbox" id="track-stock" checked={form.track_stock} onChange={(e) => setForm({ ...form, track_stock: e.target.checked })} className="h-4 w-4 rounded border-line bg-surface-raised accent-accent" />
            <label htmlFor="track-stock" className="text-sm text-ink-muted cursor-pointer">Track stock quantity</label>
          </div>
          {form.track_stock && (
            <div>
              <label className="label">Current Stock *</label>
              <input type="number" min="0" className={`input ${formErrors.stock_qty ? 'input-error' : ''}`} value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: e.target.value })} />
              {formErrors.stock_qty && <p className="error-text">{formErrors.stock_qty}</p>}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <Button id="save-service-btn" size="sm" onClick={handleSave} loading={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleToggleActive}
        title={confirmTarget?.is_active ? 'Deactivate Service' : 'Activate Service'}
        message={`Are you sure you want to ${confirmTarget?.is_active ? 'deactivate' : 'activate'} "${confirmTarget?.name}"?`}
        confirmLabel={confirmTarget?.is_active ? 'Deactivate' : 'Activate'}
        danger={!!confirmTarget?.is_active}
      />
    </div>
  )
}
