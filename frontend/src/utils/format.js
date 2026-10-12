// Format currency as ₹1,234.50
export function formatCurrency(amount) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Format datetime in local timezone: 06 Oct 2026, 08:30 AM
export function formatDateTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

// Format date only: 06 Oct 2026
export function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Format duration in minutes to "1h 30m" or "45m"
export function formatDuration(minutes) {
  if (minutes == null) return '—'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// Elapsed time from start to now, in seconds
export function elapsedSeconds(startTime, serverTimeIso) {
  const now = Date.now()
  const serverNow = serverTimeIso ? new Date(serverTimeIso).getTime() : now
  const offset = now - serverNow   // client ahead = positive
  const start = new Date(startTime).getTime()
  return Math.floor((now - offset - start) / 1000)
}

// Format seconds as H:MM:SS
export function formatTimer(totalSeconds) {
  if (totalSeconds < 0) totalSeconds = 0
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

// Extract API error message
export function apiError(err) {
  return err?.response?.data?.message || err?.message || 'An unexpected error occurred'
}
