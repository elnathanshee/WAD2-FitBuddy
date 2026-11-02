// Handlers for /api/analytics (the Dashboard charts and consistency numbers).
// Loads the user's habits and check-ins, then hands them to utils/analytics.js,
// which does every calculation (completion rates, daily breakdowns, streaks).

import { getDb } from '../config/neon.js'
import { toDateKey, isValidDateKey } from '../utils/dates.js'
import { PERIODS, buildAnalytics, buildWeeklySummary } from '../utils/analytics.js'

// Sanity limit on how many periods back `offset` may go
const MAX_OFFSET = 366

// Loads one user's habits and check-ins and converts the database rows into the plain shapes
// utils/analytics.js expects. Also used by friendController.js for a friend's profile.
export async function loadUserData(userId) {
  const sql = getDb()
  const habitRows = await sql`
    SELECT id, name, icon, category, frequency, target_amount, target_unit, created_at
    FROM habits
    WHERE user_id = ${userId}
  `
  const checkInRows = await sql`
    SELECT habit_id, date, count
    FROM check_ins
    WHERE user_id = ${userId}
  `
  const habits = habitRows.map((row) => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    category: row.category,
    frequency: row.frequency,
    target: Number(row.target_amount),
    unit: row.target_unit,
    createdOn: toDateKey(new Date(row.created_at)),
  }))
  const checkIns = checkInRows.map((row) => ({
    habitId: row.habit_id,
    date: row.date,
    count: Number(row.count),
  }))
  return { habits, checkIns }
}

/**
 * GET /api/analytics/summary?period=day|week|month&today=YYYY-MM-DD&offset=0
 * `today` comes from the browser so periods follow the user's local calendar.
 * `offset` is 0 for the current period, -1 for the one before, and so on.
 */
export async function getSummary(req, res) {
  const { period = 'week', today = toDateKey(), offset = '0' } = req.query
  if (!PERIODS.includes(period)) {
    return res.status(400).json({ message: 'period must be day, week or month' })
  }
  if (!isValidDateKey(today)) {
    return res.status(400).json({ message: 'today must be a real day in YYYY-MM-DD format' })
  }
  const steps = Number(offset)
  if (!Number.isInteger(steps) || steps > 0 || steps < -MAX_OFFSET) {
    return res.status(400).json({ message: 'offset must be a whole number, 0 or below' })
  }

  const { habits, checkIns } = await loadUserData(req.userId)
  res.json(buildAnalytics(habits, checkIns, { period, today, offset: steps }))
}

/**
 * GET /api/analytics/weekly-summary
 * The last 7 days (kept for scripts/verifyAllEndpoints.js and older clients).
 */
export async function getWeeklySummary(req, res) {
  const { today = toDateKey() } = req.query
  if (!isValidDateKey(today)) {
    return res.status(400).json({ message: 'today must be a real day in YYYY-MM-DD format' })
  }
  const { habits, checkIns } = await loadUserData(req.userId)
  res.json(buildWeeklySummary(habits, checkIns, today))
}
