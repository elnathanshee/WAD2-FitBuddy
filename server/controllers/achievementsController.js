// Handler for GET /api/achievements (the Achievements page).
// Reads the user's whole check-in history, then asks achievementsService.js
// which badges that history has earned. All the rules live in the service;
// this file only fetches rows and sends JSON.

import { getDb } from '../config/neon.js'
import { completedPeriodsByHabit } from '../services/pointsService.js'
import { BADGES, buildStats, evaluateBadges } from '../services/achievementsService.js'
import { resolveToday } from '../utils/dates.js'

// GET /api/achievements?today=YYYY-MM-DD
// -> 200 { stats, badges: [...], earned, total }
export async function listAchievements(req, res) {
  const sql = getDb()
  const today = resolveToday(req.query.today)

  // Three small queries, run together:
  //  1. every check-in this user has ever made, added up per habit per day
  //  2. this user's habits, so we know which ones are daily
  //  3. how many accepted friends they have
  const [progressRows, habitRows, friendRows] = await Promise.all([
    sql`
      SELECT
        c.habit_id::text,
        c.date,
        SUM(c.count)::float AS logged,
        h.frequency,
        h.target_amount::float AS target
      FROM check_ins c
      JOIN habits h ON c.habit_id = h.id
      WHERE c.user_id = ${req.userId}
      GROUP BY c.habit_id, c.date, h.frequency, h.target_amount
    `,
    sql`
      SELECT id::text, frequency FROM habits WHERE user_id = ${req.userId}
    `,
    sql`
      SELECT COUNT(*)::int AS count
      FROM friendships
      WHERE status = 'accepted'
        AND (requester_id = ${req.userId} OR addressee_id = ${req.userId})
    `,
  ])

  // Rename the database columns to the names the service expects
  const rows = progressRows.map((row) => ({
    habitId: row.habit_id,
    date: row.date,
    logged: row.logged,
    frequency: row.frequency,
    target: row.target,
  }))

  const stats = buildStats({
    byHabit: completedPeriodsByHabit(rows),
    dailyHabitIds: habitRows.filter((habit) => habit.frequency !== 'weekly').map((habit) => habit.id),
    today,
    friendCount: friendRows[0]?.count ?? 0,
  })

  const badges = evaluateBadges(stats)

  res.json({
    stats,
    badges,
    earned: badges.filter((badge) => badge.earned).length,
    total: BADGES.length,
  })
}
