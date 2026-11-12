import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px] overflow-y-auto"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={`
        bg-surface border-2 border-[#2A2407] rounded-[24px]
        shadow-[6px_6px_0px_#2A2407]
        w-full ${sizes[size]} flex flex-col
        animate-fade-up relative overflow-visible my-auto
      `}>
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#2A2407] bg-[#ECE4A9] rounded-t-[22px]">
          <h2 id="modal-title" className="text-base font-extrabold text-ink tracking-tight font-geist">{title}</h2>
          <button
            onClick={onClose}
            className="text-ink hover:text-white hover:bg-[#2A2407] border-2 border-[#2A2407] p-1.5 rounded-xl transition-all shadow-[1px_1px_0px_#2A2407] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-visible">
          {children}
        </div>
      </div>
    </div>
  )
}
