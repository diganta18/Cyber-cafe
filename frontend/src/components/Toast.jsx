import { useEffect } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'

export default function Toast({ toasts, remove }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
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
    <div className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border max-w-sm w-full transition-all duration-300 ${
      isSuccess
        ? 'bg-white border-green-200 text-green-800'
        : 'bg-white border-red-200 text-red-800'
    }`}>
      {isSuccess
        ? <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
        : <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
      }
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-gray-400 hover:text-gray-600"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
