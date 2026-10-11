// 'YYYY-MM-DD' date keys for the user's LOCAL calendar day.
// The server stores check-ins under these keys (see server/models/CheckIn.js),
// so the browser decides what "today" is, not the server.

export function toDateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ('2026-02-28', 1) → '2026-03-01'. n can be negative.
export function addDays(dateKey, n) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return toDateKey(new Date(y, m - 1, d + n, 12))
}

// '2026-10-09' → Date at local noon (safe from daylight-saving shifts)
export function fromDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

// The Monday that starts the week containing dateKey (weeks run Monday–Sunday).
export function weekStart(dateKey) {
  const daysSinceMonday = (fromDateKey(dateKey).getDay() + 6) % 7 // getDay(): 0 = Sunday
  return addDays(dateKey, -daysSinceMonday)
}
