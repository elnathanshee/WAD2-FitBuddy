// Date helpers. Everything works on plain "YYYY-MM-DD" strings rather than
// Date objects with times attached, because habits are tracked per calendar
// day. Comparing timestamps instead would mean a check-in at 11:58pm and one
// at 12:02am look like the same "day" or different ones depending on the
// server's timezone — a whole class of bugs we simply avoid.

/** Today as "YYYY-MM-DD" (UTC). */
function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

/** Add n days (may be negative) to a "YYYY-MM-DD" string. */
function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Whole days between two "YYYY-MM-DD" strings (a - b). */
function diffInDays(a, b) {
  const ms = new Date(`${a}T00:00:00.000Z`) - new Date(`${b}T00:00:00.000Z`)
  return Math.round(ms / 86400000)
}

/**
 * The Monday of the ISO week containing dateStr.
 * This single function defines what "a week" means for the whole leaderboard.
 */
function mondayOf(dateStr) {
  const d = new Date(`${dateStr}T00:00:00.000Z`)
  const isoDay = d.getUTCDay() === 0 ? 7 : d.getUTCDay() // Mon=1 ... Sun=7
  d.setUTCDate(d.getUTCDate() - (isoDay - 1))
  return d.toISOString().slice(0, 10)
}

module.exports = { todayStr, addDays, diffInDays, mondayOf }
