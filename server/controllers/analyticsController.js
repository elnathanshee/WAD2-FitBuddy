// =============================================================================
// [IS216 Project Addition: Analytics & Consistency Controller]
// Technology: Express.js + Neon PostgreSQL
//
// Computes daily habit consistency, 7-day completion rates, and category distribution.
// =============================================================================

import { getDb } from '../config/neon.js'
import { toDateKey, addDays } from '../utils/dates.js'

/**
 * GET /api/analytics/weekly-summary
 */
export async function getWeeklySummary(req, res) {
  const sql = getDb()
  const today = toDateKey()

  // 1. Fetch user's habits
  const habits = await sql`
    SELECT id, name, category, target_amount, frequency
    FROM habits
    WHERE user_id = ${req.userId}
  `

  const totalDailyHabits = habits.filter((h) => h.frequency !== 'weekly').length || 1

  // 2. Fetch check-ins for the last 7 days
  const sevenDaysAgo = addDays(today, -6)
  const recentCheckIns = await sql`
    SELECT c.habit_id, c.date, c.count, h.target_amount, h.category
    FROM check_ins c
    JOIN habits h ON c.habit_id = h.id
    WHERE c.user_id = ${req.userId} AND c.date >= ${sevenDaysAgo} AND c.date <= ${today}
  `

  // Build day-by-day matrix (Mon through Sun or last 7 days)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const days = []

  let totalCompletions = 0

  for (let i = 6; i >= 0; i--) {
    const dKey = addDays(today, -i)
    const dateObj = new Date(dKey + 'T00:00:00')
    const dayLabel = dayNames[dateObj.getDay()]

    const dayRows = recentCheckIns.filter((r) => r.date === dKey)
    const completedCount = dayRows.filter((r) => Number(r.count) >= Number(r.target_amount)).length
    totalCompletions += completedCount

    const pct = Math.min(100, Math.round((completedCount / totalDailyHabits) * 100))

    days.push({
      date: dKey,
      day: dayLabel,
      completed: completedCount,
      total: totalDailyHabits,
      percentage: pct,
    })
  }

  // Category distribution
  const categoryCount = {}
  for (const row of recentCheckIns) {
    categoryCount[row.category] = (categoryCount[row.category] || 0) + 1
  }

  const overallRate = Math.round((totalCompletions / (totalDailyHabits * 7)) * 100)

  res.json({
    days,
    overallCompletionRate: Math.min(100, overallRate),
    totalCheckIns: recentCheckIns.length,
    activeHabitsCount: habits.length,
    categoryCount,
  })
}
