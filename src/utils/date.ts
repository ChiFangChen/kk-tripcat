/** Format ISO date string (YYYY-MM-DD) to YYYY/MM/DD */
export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}/${m}/${day}`
}

/** Check if a date string (YYYY-MM-DD) is today */
export function isToday(dateStr: string): boolean {
  if (!dateStr) return false
  const today = new Date()
  const d = new Date(dateStr)
  return d.getFullYear() === today.getFullYear()
    && d.getMonth() === today.getMonth()
    && d.getDate() === today.getDate()
}
