import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { formatCurrency, apiError } from '../utils/format'
import Table from '../components/Table'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Spinner from '../components/Spinner'
import { Plus, Pencil, Archive, ToggleLeft, ToggleRight, Search } from 'lucide-react'

export default function Services({ toast }) {
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
      const res = await api.get('/services?limit=100&active=all')
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
      const endpoint = confirmTarget.is_active ? 'deactivate' : 'activate'
      await api.patch(`/services/${confirmTarget.id}/${endpoint}`)
      toast.success(`Service ${confirmTarget.is_active ? 'deactivated' : 'activated'}`)
      fetchServices()
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setConfirmTarget(null)
    }
  }

  const filtered = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    { key: 'name', label: 'Service Name', render: (val) => <span className="font-medium">{val}</span> },
    { key: 'category', label: 'Category', render: (val) => <span className="badge badge-PC capitalize">{val}</span> },
    { key: 'unit', label: 'Unit' },
    { key: 'price', label: 'Price', render: (val) => formatCurrency(val) },
    {
      key: 'track_stock', label: 'Stock',
      render: (val, row) => val
        ? <span className={`font-mono text-sm ${row.stock_qty <= 5 ? 'text-red-600 font-bold' : 'text-gray-700'}`}>{row.stock_qty}</span>
        : <span className="text-gray-400 text-xs">Unlimited</span>
    },
    {
      key: 'is_active', label: 'Status',
      render: (val) => val
        ? <span className="badge badge-available">Active</span>
        : <span className="badge badge-void">Inactive</span>
    },
    {
      key: 'id', label: '',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(row)} className="btn-ghost py-1 px-2 text-xs" aria-label={`Edit ${row.name}`}>
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setConfirmTarget(row)}
            className="btn-ghost py-1 px-2 text-xs"
            aria-label={row.is_active ? 'Deactivate' : 'Activate'}
          >
            {row.is_active
              ? <ToggleRight className="h-4 w-4 text-green-600" />
              : <ToggleLeft className="h-4 w-4 text-gray-400" />}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Services & Stock</h1>
        <button id="create-service-btn" className="btn-primary" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New Service
        </button>
      </div>

      <div className="mb-4">
        <div className="relative w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search services…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <Table columns={columns} data={filtered} loading={loading} emptyMessage="No services found." />
      </div>

      {/* Form Modal */}
      <Modal isOpen={modal === 'form'} onClose={() => setModal(null)} title={editing ? 'Edit Service' : 'New Service'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Service Name *</label>
            <input className={`input ${formErrors.name ? 'input-error' : ''}`} placeholder="e.g. Print B/W" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} id="service-name-input" />
            {formErrors.name && <p className="error-text">{formErrors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
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
          <div className="flex items-center gap-3">
            <input type="checkbox" id="track-stock" checked={form.track_stock} onChange={(e) => setForm({ ...form, track_stock: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-primary-600" />
            <label htmlFor="track-stock" className="text-sm text-gray-700 cursor-pointer">Track stock quantity</label>
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
            <button id="save-service-btn" className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <Spinner size="sm" /> : null} {saving ? 'Saving…' : 'Save'}
            </button>
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
