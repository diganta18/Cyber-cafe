import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { formatDateTime, apiError } from '../utils/format'
import Table from '../components/Table'
import Modal from '../components/Modal'
import Spinner from '../components/Spinner'
import Button from '../components/Button'
import { Plus, Pencil, Search, Phone, X } from 'lucide-react'

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
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-[#ECE4A9] border-2 border-[#2A2407] text-ink text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-[1px_1px_0px_#2A2407]">
            {val.charAt(0).toUpperCase()}
          </div>
          <span className="font-bold text-ink font-geist">{val}</span>
        </div>
      ),
    },
    {
      key: 'phone', label: 'Phone',
      render: (val) => val
        ? <span className="flex items-center gap-1.5 text-xs text-ink-muted"><Phone className="h-3 w-3 text-ink-faint" />{val}</span>
        : <span className="text-ink-faint text-xs">—</span>,
    },
    {
      key: 'email', label: 'Email',
      render: (val) => val ? <span className="text-xs text-ink-muted">{val}</span> : <span className="text-ink-faint text-xs">—</span>,
    },
    {
      key: 'visit_count', label: 'Visits',
      render: (val) => {
        const count = val ?? 0
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold font-mono border ${
            count > 0
              ? 'bg-[#EC7E00]/15 text-[#2A2407] border-[#EC7E00]/40'
              : 'bg-stone-100 text-ink-muted border-stone-200'
          }`}>
            {count} {count === 1 ? 'visit' : 'visits'}
          </span>
        )
      },
    },
    { key: 'created_at', label: 'Joined', render: (val) => <span className="text-xs text-ink-faint">{formatDateTime(val)}</span> },
    {
      key: 'id', label: '',
      render: (_, row) => (
        <div className="flex justify-end">
          <button onClick={() => openEdit(row)} className="btn-ghost py-1 px-2 text-xs" aria-label={`Edit ${row.name}`}>
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="text-xs text-ink-muted mt-1">{total} registered customers</p>
        </div>
        <Button id="create-customer-btn" size="sm" onClick={openCreate}>
          New customer
        </Button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none stroke-[2.2]" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            className="input pl-10 w-64 text-xs font-medium"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-secondary text-xs py-1.5 px-3">Search</button>
        {search && (
          <button type="button" className="btn-ghost text-xs" onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}>
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </form>

      <div className="card">
        <Table columns={columns} data={customers} loading={loading} emptyMessage="No customers found." />
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-line">
            <p className="text-xs text-ink-faint">
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button className="btn-secondary py-1 px-3 text-xs" disabled={page === 1} onClick={() => setPage(page - 1)}>← Prev</button>
              <span className="text-xs text-ink-muted px-1">{page} / {totalPages}</span>
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
            <Button id="save-customer-btn" size="sm" onClick={handleSave} loading={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
