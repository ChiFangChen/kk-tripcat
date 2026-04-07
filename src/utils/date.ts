/** Format ISO date string (YYYY-MM-DD) to YYYY／M／D */
export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${d.getFullYear()}／${d.getMonth() + 1}／${d.getDate()}`
}
