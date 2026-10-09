// Small helpers for 'YYYY-MM-DD' date keys (see models/CheckIn.js for why
// dates are stored as strings).

// Date object → 'YYYY-MM-DD' using the LOCAL calendar day.
export function toDateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ('2026-02-28', 1) → '2026-03-01'. n can be negative.
// Uses noon so daylight-saving shifts can never push the result onto another day.
export function addDays(dateKey, n) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return toDateKey(new Date(y, m - 1, d + n, 12))
}
