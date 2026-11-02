import Modal from './Modal'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false, loading = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex gap-4 mb-6">
        <div className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${danger ? 'bg-danger/10' : 'bg-warning/10'}`}>
          <AlertTriangle className={`h-5 w-5 ${danger ? 'text-danger' : 'text-warning'}`} />
        </div>
        <p className="text-sm text-ink-muted leading-relaxed pt-1.5">{message}</p>
      </div>
      <div className="flex justify-end gap-3">
        <button className="btn-secondary" onClick={onClose} disabled={loading}>
          Cancel
        </button>
        <button
          className={danger ? 'btn-danger' : 'btn-primary'}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Processing…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
