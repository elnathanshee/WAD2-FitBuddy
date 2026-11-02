// Small helpers for 'YYYY-MM-DD' date keys. Dates are stored and compared as plain strings so
// time zones and daylight saving can never shift a day. Used by streak.js, analytics.js and the controllers.

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

// The Monday that starts the week containing dateKey (weeks run Monday–Sunday).
// ('2026-10-11', a Sunday) → '2026-10-05'
export function weekStart(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  const daysSinceMonday = (new Date(y, m - 1, d, 12).getDay() + 6) % 7 // getDay(): 0 = Sunday
  return addDays(dateKey, -daysSinceMonday)
}

// True only for a real calendar day written as YYYY-MM-DD (rejects '2026-02-31').
export function isValidDateKey(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && addDays(value, 0) === value
}

// The browser sends its own local date as ?today=, because "today" for the user is not "today" on
// the server. Anything that does not look like YYYY-MM-DD is ignored and the server's date is used.
export function resolveToday(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : toDateKey()
}
