import { useEffect } from 'react'
import { CheckCircle2, XCircle, X } from 'lucide-react'

export default function Toast({ toasts, remove }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2.5 pointer-events-none max-w-sm w-full">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={remove} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onRemove }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), toast.duration || 4000)
    return () => clearTimeout(timer)
  }, [toast, onRemove])

  const isSuccess = toast.type === 'success'

  return (
    <div className={`
      pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-xl shadow-card-hover
      border animate-slide-in bg-surface
      ${isSuccess ? 'border-success/30' : 'border-danger/30'}
    `}>
      {isSuccess
        ? <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
        : <XCircle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
      }
      <p className="text-sm font-medium text-ink flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-ink-muted hover:text-ink transition-colors mt-0.5 flex-shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
