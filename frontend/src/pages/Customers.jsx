import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { formatDateTime, apiError } from '../utils/format'
import Table from '../components/Table'
import Modal from '../components/Modal'
import Spinner from '../components/Spinner'
import { Plus, Pencil, Search, Phone } from 'lucide-react'

export default function Customers({ toast }) {
  const [customers, setCustomers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const LIMIT = 15

  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' })
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: LIMIT })
      if (search) params.set('q', search)
      const res = await api.get(`/customers?${params}`)
      setCustomers(res.data.data.items)
      setTotal(res.data.data.total)
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setLoading(false)
    }
  }, [page, search, toast])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', phone: '', email: '', notes: '' })
    setFormErrors({})
    setModal('form')
  }

  const openEdit = (c) => {
    setEditing(c)
    setForm({ name: c.name, phone: c.phone || '', email: c.email || '', notes: c.notes || '' })
    setFormErrors({})
    setModal('form')
  }

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (form.phone && !/^\d{10}$/.test(form.phone)) errs.phone = 'Phone must be 10 digits'
    return errs
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setFormErrors(errs); return }
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/customers/${editing.id}`, form)
        toast.success('Customer updated')
      } else {
        await api.post('/customers', form)
        toast.success('Customer added')
      }
      setModal(null)
      fetchCustomers()
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setSaving(false)
    }
  }

  const totalPages = Math.ceil(total / LIMIT)

  const columns = [
    {
      key: 'name', label: 'Customer',
      render: (val) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-surface-raised border border-line text-ink-muted text-xs font-bold flex items-center justify-center flex-shrink-0">
            {val.charAt(0).toUpperCase()}
          </div>
          <span className="font-semibold text-ink">{val}</span>
        </div>
      ),
    },
    {
      key: 'phone', label: 'Phone',
      render: (val) => val
        ? <span className="flex items-center gap-1.5 text-sm text-ink-muted"><Phone className="h-3.5 w-3.5 text-ink-faint" />{val}</span>
        : <span className="text-ink-faint">—</span>,
    },
    {
      key: 'email', label: 'Email',
      render: (val) => val ? <span className="text-sm text-ink-muted">{val}</span> : <span className="text-ink-faint">—</span>,
    },
    {
      key: 'visit_count', label: 'Visits',
      render: (val) => (
        <span className="inline-flex items-center justify-center h-6 min-w-6 px-2 rounded-full bg-surface-raised border border-line text-ink-muted text-xs font-bold">
          {val ?? 0}
        </span>
      ),
    },
    { key: 'created_at', label: 'Joined', render: (val) => <span className="text-sm text-ink-muted">{formatDateTime(val)}</span> },
    {
      key: 'id', label: '',
      render: (_, row) => (
        <button onClick={() => openEdit(row)} className="btn-ghost py-1.5 px-2" aria-label={`Edit ${row.name}`}>
          <Pencil className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="text-sm text-ink-muted mt-0.5">{total} total customers</p>
        </div>
        <button id="create-customer-btn" className="btn-primary" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New Customer
        </button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-faint" />
          <input
            type="text"
            placeholder="Search by name or phone…"
            className="input pl-9 w-64"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-secondary">Search</button>
        {search && (
          <button type="button" className="btn-ghost" onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}>
            Clear
          </button>
        )}
      </form>

      <div className="card">
        <Table columns={columns} data={customers} loading={loading} emptyMessage="No customers found." />
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-line">
            <p className="text-xs text-ink-muted">
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button className="btn-secondary py-1 px-3 text-xs" disabled={page === 1} onClick={() => setPage(page - 1)}>← Prev</button>
              <span className="text-xs text-ink-muted self-center px-2">{page} / {totalPages}</span>
              <button className="btn-secondary py-1 px-3 text-xs" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={modal === 'form'} onClose={() => setModal(null)} title={editing ? 'Edit Customer' : 'New Customer'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input className={`input ${formErrors.name ? 'input-error' : ''}`} placeholder="Ravi Kumar" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} id="customer-name-input" />
            {formErrors.name && <p className="error-text">{formErrors.name}</p>}
          </div>
          <div>
            <label className="label">Phone</label>
            <input type="tel" className={`input ${formErrors.phone ? 'input-error' : ''}`} placeholder="10-digit mobile number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            {formErrors.phone && <p className="error-text">{formErrors.phone}</p>}
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" placeholder="optional" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} placeholder="Optional notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button id="save-customer-btn" className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <Spinner size="sm" /> : null} {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
