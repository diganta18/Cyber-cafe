export default function Spinner({ size = 'md' }) {
  const sizes = { sm: 'h-4 w-4 border-2', md: 'h-6 w-6 border-2', lg: 'h-10 w-10 border-[3px]' }
  return (
    <span
      className={`inline-block rounded-full border-line border-t-accent animate-spin ${sizes[size]}`}
      role="status"
      aria-label="Loading"
    />
  )
}
