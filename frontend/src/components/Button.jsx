import React from 'react'

export default function Button({
  children = 'E N T R Y',
  type = 'button',
  variant = 'accent', // 'accent' | 'surface' | 'dark' | 'danger' | 'success' | 'secondary'
  size = 'md',        // 'sm' | 'md' | 'lg'
  onClick,
  disabled = false,
  loading = false,
  className = '',
  id,
  showArrows = true,
  icon: Icon,
  ...props
}) {
  const sizeClass = size === 'sm' ? 'animated-btn-sm' : size === 'lg' ? 'animated-btn-lg' : 'animated-btn-md'
  const normalizedVariant = variant === 'secondary' ? 'surface' : variant
  const variantClass = `animated-variant-${normalizedVariant}`
  const arrowClass = showArrows ? '' : 'no-arrows'

  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`animated-button ${sizeClass} ${variantClass} ${arrowClass} ${className}`}
      {...props}
    >
      {showArrows && (
        <svg xmlns="http://www.w3.org/2000/svg" className="arr-2" viewBox="0 0 24 24">
          <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
        </svg>
      )}
      <span className="text inline-flex items-center gap-1.5">
        {Icon && !loading && <Icon className={`${size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} shrink-0`} />}
        {loading ? 'Please wait…' : children}
      </span>
      {showArrows && <span className="circle" />}
      {showArrows && (
        <svg xmlns="http://www.w3.org/2000/svg" className="arr-1" viewBox="0 0 24 24">
          <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
        </svg>
      )}
    </button>
  )
}
