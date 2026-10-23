import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { apiError } from '../utils/format'
import Table from '../components/Table'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Spinner from '../components/Spinner'
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Staff({ toast }) {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'staff' })
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const [confirmTarget, setConfirmTarget] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/users')
      setUsers(res.data.data)
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', username: '', password: '', role: 'staff' })
    setFormErrors({})
    setModal('form')
  }

  const openEdit = (u) => {
    setEditing(u)
    setForm({ name: u.name, username: u.username, password: '', role: u.role })
    setFormErrors({})
    setModal('form')
  }

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name required'
    if (!form.username.trim()) errs.username = 'Username required'
    if (!editing && !form.password.trim()) errs.password = 'Password required for new user'
    if (form.password && form.password.length < 6) errs.password = 'Password must be ≥ 6 characters'
    return errs
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setFormErrors(errs); return }
    setSaving(true)
    try {
      const body = { name: form.name, username: form.username, role: form.role }
      if (form.password) body.password = form.password
      if (editing) {
        await api.put(`/users/${editing.id}`, body)
        toast.success('Staff member updated')
      } else {
        await api.post('/users', body)
        toast.success('Staff member created')
      }
      setModal(null)
      fetchUsers()
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setSaving(false)
    }
  }

  const openDelete = (u) => {
    setConfirmTarget(u)
    setConfirmAction('delete')
  }

  const handleConfirm = async () => {
    try {
      if (confirmAction === 'delete') {
        await api.delete(`/users/${confirmTarget.id}`)
        toast.success('Staff member removed')
      }
      fetchUsers()
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setConfirmTarget(null)
      setConfirmAction(null)
    }
  }

  const columns = [
    {
      key: 'name', label: 'Name',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-surface-raised border border-line text-ink-muted text-xs font-bold flex items-center justify-center flex-shrink-0">
            {val.charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="font-semibold text-ink">{val}</span>
            {row.id === me?.id && <span className="ml-2 text-xs text-ink-muted font-medium">(you)</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'username', label: 'Username',
      render: (val) => <span className="font-mono text-sm text-ink-muted">{val}</span>,
    },
    {
      key: 'role', label: 'Role',
      render: (val) => val === 'admin'
        ? <span className="badge bg-surface-raised text-ink-muted ring-1 ring-line flex items-center gap-1 w-fit"><ShieldCheck className="h-3 w-3" /> Admin</span>
        : <span className="badge badge-available">Staff</span>,
    },
    {
      key: 'id', label: '',
      render: (_, row) => row.id !== me?.id ? (
        <div className="flex items-center gap-1.5">
          <button onClick={() => openEdit(row)} className="btn-ghost py-1.5 px-2" aria-label={`Edit ${row.name}`}>
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => openDelete(row)}
            className="btn-ghost py-1.5 px-2 text-ink-muted hover:bg-danger/10 hover:text-danger"
            aria-label={`Delete ${row.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p className="text-sm text-ink-muted mt-0.5">{users.length} team members</p>
        </div>
        <button id="create-staff-btn" className="btn-primary" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Staff
        </button>
      </div>

      <div className="card">
        <Table columns={columns} data={users} loading={loading} emptyMessage="No staff members found." />
      </div>

      <Modal isOpen={modal === 'form'} onClose={() => setModal(null)} title={editing ? 'Edit Staff Member' : 'Add Staff Member'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input className={`input ${formErrors.name ? 'input-error' : ''}`} placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} id="staff-name-input" />
            {formErrors.name && <p className="error-text">{formErrors.name}</p>}
          </div>
          <div>
            <label className="label">Username *</label>
            <input className={`input ${formErrors.username ? 'input-error' : ''}`} placeholder="login username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="off" />
            {formErrors.username && <p className="error-text">{formErrors.username}</p>}
          </div>
          <div>
            <label className="label">{editing ? 'New Password (leave blank to keep)' : 'Password *'}</label>
            <input type="password" className={`input ${formErrors.password ? 'input-error' : ''}`} placeholder={editing ? 'Leave blank to keep' : 'Min 6 characters'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
            {formErrors.password && <p className="error-text">{formErrors.password}</p>}
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button id="save-staff-btn" className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <Spinner size="sm" /> : null} {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmTarget}
        onClose={() => { setConfirmTarget(null); setConfirmAction(null) }}
        onConfirm={handleConfirm}
        title="Remove Staff Member"
        message={`Remove "${confirmTarget?.name}" (${confirmTarget?.username})? This cannot be undone.`}
        confirmLabel="Remove"
        danger
      />
    </div>
  )
}
