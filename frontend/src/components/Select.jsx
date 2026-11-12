import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export default function Select({
  id,
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  disabled = false,
  className = '',
  error = false,
  label,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef(null)
  const listRef = useRef(null)

  // Normalize options to [{ value, label }]
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: String(opt.value ?? opt.id ?? ''),
        label: opt.label ?? opt.name ?? String(opt.value ?? opt.id ?? ''),
      }
    }
    return { value: String(opt), label: String(opt) }
  })

  const selectedIndex = normalizedOptions.findIndex(
    (opt) => String(opt.value) === String(value)
  )
  const selectedOption = selectedIndex >= 0 ? normalizedOptions[selectedIndex] : null

  const handleSelect = (optVal) => {
    if (disabled) return
    setIsOpen(false)
    if (onChange) {
      const syntheticEvent = {
        target: { value: optVal, id, name: id },
        currentTarget: { value: optVal, id, name: id },
        value: optVal,
      }
      onChange(syntheticEvent, optVal)
    }
  }

  // Handle outside click, Escape, and Arrow keys
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setIsOpen(true)
          setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0)
        }
        return
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        setIsOpen(false)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex((prev) => (prev + 1) % normalizedOptions.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex((prev) => (prev - 1 + normalizedOptions.length) % normalizedOptions.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < normalizedOptions.length) {
          handleSelect(normalizedOptions[highlightedIndex].value)
        }
      }
    }

    const container = containerRef.current
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    if (container) {
      container.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      if (container) {
        container.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [isOpen, highlightedIndex, normalizedOptions, selectedIndex])

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const el = listRef.current.children[highlightedIndex]
      if (el) {
        el.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex, isOpen])

  return (
    <div className={`relative w-full ${isOpen ? 'z-30' : 'z-10'}`} ref={containerRef}>
      {label && <label className="label">{label}</label>}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen)
            setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0)
          }
        }}
        className={`
          w-full bg-white border-2 border-[#2A2407] rounded-xl px-3.5 py-2.5 text-sm font-bold text-ink
          shadow-[2px_2px_0px_#2A2407] flex items-center justify-between cursor-pointer
          transition-all duration-150 font-geist text-left
          hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#2A2407]
          active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0px_#2A2407]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40
          disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
          ${error ? 'border-danger' : ''}
          ${isOpen ? 'border-[#2A2407] ring-2 ring-accent/25' : ''}
          ${className}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`truncate ${selectedOption ? 'text-ink' : 'text-ink-faint font-medium'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-ink flex-shrink-0 transition-transform duration-200 stroke-[2.5] ml-2 ${
            isOpen ? 'rotate-180 text-accent' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-[70] bg-white border-2 border-[#2A2407] rounded-xl shadow-[6px_6px_0px_#2A2407] p-1.5 max-h-52 overflow-y-auto animate-dropdown font-geist"
        >
          {normalizedOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-ink-faint text-center font-medium">
              No options available
            </div>
          ) : (
            normalizedOptions.map((opt, idx) => {
              const isSelected = String(opt.value) === String(value)
              const isHighlighted = idx === highlightedIndex
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(opt.value)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`
                    px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-100 cursor-pointer
                    flex items-center justify-between my-0.5
                    ${
                      isSelected
                        ? 'bg-accent text-white shadow-[1px_1px_0px_#2A2407]'
                        : isHighlighted
                        ? 'bg-[#ECE4A9] text-ink'
                        : 'text-ink hover:bg-[#ECE4A9]'
                    }
                  `}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="h-4 w-4 text-white stroke-[2.5] flex-shrink-0 ml-2" />}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
