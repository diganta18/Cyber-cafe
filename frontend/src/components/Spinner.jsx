export default function Spinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-10 w-10 border-4',
  }
  return (
    <div
      className={`${sizes[size]} rounded-full border-primary-600 border-t-transparent animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}
