import Modal from './Modal'
import { AlertTriangle } from 'lucide-react'
import Button from './Button'

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false, loading = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex gap-4 mb-6">
        <div className={`flex-shrink-0 h-11 w-11 rounded-xl border-2 border-[#2A2407] shadow-[2px_2px_0px_#2A2407] flex items-center justify-center ${danger ? 'bg-danger/15' : 'bg-[#ECE4A9]'}`}>
          <AlertTriangle className={`h-5 w-5 ${danger ? 'text-danger' : 'text-accent'}`} />
        </div>
        <p className="text-sm text-ink font-medium leading-relaxed pt-1.5">{message}</p>
      </div>
      <div className="flex justify-end gap-3">
        <button className="btn-secondary" onClick={onClose} disabled={loading}>
          Cancel
        </button>
        <Button
          variant={danger ? 'danger' : 'accent'}
          size="sm"
          onClick={onConfirm}
          loading={loading}
        >
          {loading ? 'Processing…' : confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
