import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { apiError } from '../utils/format'
import Table from '../components/Table'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Spinner from '../components/Spinner'
import Button from '../components/Button'
import Select from '../components/Select'
import { Plus, Pencil, Trash2, ShieldCheck, UserCog } from 'lucide-react'
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
        <div className="flex items-center gap-2.5">
          <div className={`h-8 w-8 rounded-lg border-2 border-[#2A2407] shadow-[1px_1px_0px_#2A2407] text-xs font-extrabold flex items-center justify-center flex-shrink-0 ${
            row.role === 'admin' ? 'bg-[#EC7E00] text-white' : 'bg-[#ECE4A9] text-ink'
          }`}>
            {val.charAt(0).toUpperCase()}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-ink font-geist">{val}</span>
            {row.id === me?.id && (
              <span className="text-[10px] font-extrabold text-[#2A2407] bg-[#ECE4A9] border border-[#2A2407] rounded-md px-1.5 py-0.5 shadow-[1px_1px_0px_#2A2407]">
                YOU
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'username', label: 'Username',
      render: (val) => <span className="font-mono text-xs text-ink-muted">@{val}</span>,
    },
    {
      key: 'role', label: 'Role',
      render: (val) => val === 'admin'
        ? <span className="badge bg-accent/15 text-accent border-accent flex items-center gap-1 w-fit font-bold"><ShieldCheck className="h-3.5 w-3.5" /> Admin</span>
        : <span className="badge bg-[#ECE4A9] text-ink border-2 border-[#2A2407] flex items-center gap-1 w-fit font-bold"><UserCog className="h-3.5 w-3.5" /> Staff</span>,
    },
    {
      key: 'id', label: '',
      render: (_, row) => row.id !== me?.id ? (
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={() => openEdit(row)} className="btn-ghost py-1 px-2 text-xs" aria-label={`Edit ${row.name}`}>
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => openDelete(row)}
            className="btn-ghost py-1 px-2 text-xs text-ink-muted hover:text-danger"
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
          <h1 className="page-title">Staff management</h1>
          <p className="text-xs text-ink-muted mt-1">{users.length} team member{users.length !== 1 ? 's' : ''}</p>
        </div>
        <Button id="create-staff-btn" size="sm" onClick={openCreate}>
          Add staff
        </Button>
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
            <Select
              id="staff-role-select"
              label="Role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              options={[
                { value: 'staff', label: 'Staff' },
                { value: 'admin', label: 'Admin (Full Access)' },
              ]}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <Button id="save-staff-btn" size="sm" onClick={handleSave} loading={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
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
