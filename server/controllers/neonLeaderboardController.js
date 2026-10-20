// =============================================================================
// [IS216 Project Addition: Neon PostgreSQL Leaderboard Controller]
// Technology: Node.js + PostgreSQL via @neondatabase/serverless
// =============================================================================

import { getDb } from '../config/neon.js'
import {
  completedPeriodsByHabit,
  historyRange,
  scoreWeek,
  POINTS,
} from '../services/pointsService.js'
import { toDateKey, addDays, weekStart } from '../utils/dates.js'

function resolveToday(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : toDateKey()
}

// GET /api/leaderboard/weekly
export async function weeklyLeaderboard(req, res) {
  const sql = getDb()
  const today = resolveToday(req.query.today)
  const weekStartKey = weekStart(today)
  const weekEndKey = addDays(weekStartKey, 6)
  const { from, to } = historyRange(weekStartKey)

  // 1. Fetch raw progress rows
  const progressRows = await sql`
    SELECT 
      c.user_id,
      c.habit_id::text,
      c.date,
      SUM(c.count)::float AS logged,
      h.frequency,
      h.target_amount::float AS target
    FROM check_ins c
    JOIN habits h ON c.habit_id = h.id
    WHERE c.date >= ${from} AND c.date <= ${to}
    GROUP BY c.user_id, c.habit_id, c.date, h.frequency, h.target_amount
  `

  // 2. Fetch all habits & user profiles
  const [habitRows, profileRows] = await Promise.all([
    sql`SELECT id::text, user_id, frequency FROM habits`,
    sql`SELECT user_id, display_name, avatar_color FROM users`,
  ])

  const userIds = new Set([
    ...profileRows.map((p) => p.user_id),
    ...habitRows.map((h) => h.user_id),
    ...progressRows.map((r) => r.user_id),
  ])

  const rowsByUser = new Map()
  for (const row of progressRows) {
    if (!rowsByUser.has(row.user_id)) rowsByUser.set(row.user_id, [])
    rowsByUser.get(row.user_id).push({
      userId: row.user_id,
      habitId: row.habit_id,
      date: row.date,
      logged: row.logged,
      frequency: row.frequency,
      target: row.target,
    })
  }

  const dailyHabitsByUser = new Map()
  for (const habit of habitRows) {
    if (habit.frequency === 'weekly') continue
    if (!dailyHabitsByUser.has(habit.user_id)) dailyHabitsByUser.set(habit.user_id, [])
    dailyHabitsByUser.get(habit.user_id).push(habit.id)
  }

  const profileByUser = new Map(profileRows.map((p) => [p.user_id, p]))

  const scored = [...userIds].map((userId) => {
    const byHabit = completedPeriodsByHabit(rowsByUser.get(userId) ?? [])
    const breakdown = scoreWeek({
      byHabit,
      weekStartKey,
      dailyHabitIds: dailyHabitsByUser.get(userId) ?? [],
    })
    const profile = profileByUser.get(userId)
    return {
      userId,
      displayName: profile?.display_name ?? `User ${userId}`,
      avatarColor: profile?.avatar_color ?? '#7FA3D1',
      points: breakdown.total,
      breakdown,
      isCurrentUser: req.userId != null && String(userId) === String(req.userId),
    }
  })

  scored.sort((a, b) => b.points - a.points || a.displayName.localeCompare(b.displayName))

  let rank = 0
  let previousPoints = null
  const entries = scored.map((entry, index) => {
    if (entry.points !== previousPoints) {
      rank = index + 1
      previousPoints = entry.points
    }
    return { ...entry, rank }
  })

  res.json({
    weekStart: weekStartKey,
    weekEnd: weekEndKey,
    entries,
    rules: POINTS,
  })
}

// GET /api/leaderboard/me
export async function myScore(req, res) {
  const sql = getDb()
  const today = resolveToday(req.query.today)
  const weekStartKey = weekStart(today)
  const { from, to } = historyRange(weekStartKey)

  const [progressRows, habitRows] = await Promise.all([
    sql`
      SELECT 
        c.user_id,
        c.habit_id::text,
        c.date,
        SUM(c.count)::float AS logged,
        h.frequency,
        h.target_amount::float AS target
      FROM check_ins c
      JOIN habits h ON c.habit_id = h.id
      WHERE c.user_id = ${req.userId} AND c.date >= ${from} AND c.date <= ${to}
      GROUP BY c.user_id, c.habit_id, c.date, h.frequency, h.target_amount
    `,
    sql`
      SELECT id::text, frequency FROM habits WHERE user_id = ${req.userId}
    `,
  ])

  const formattedRows = progressRows.map((r) => ({
    userId: r.user_id,
    habitId: r.habit_id,
    date: r.date,
    logged: r.logged,
    frequency: r.frequency,
    target: r.target,
  }))

  const breakdown = scoreWeek({
    byHabit: completedPeriodsByHabit(formattedRows),
    weekStartKey,
    dailyHabitIds: habitRows.filter((h) => h.frequency !== 'weekly').map((h) => h.id),
  })

  res.json({ userId: req.userId, weekStart: weekStartKey, ...breakdown, rules: POINTS })
}

// PUT /api/leaderboard/profile
export async function upsertProfile(req, res) {
  const sql = getDb()
  const { displayName, avatarColor } = req.body ?? {}
  if (typeof displayName !== 'string' || displayName.trim().length === 0) {
    return res.status(400).json({ message: 'displayName is required' })
  }

  const trimmed = displayName.trim().slice(0, 60)
  const color = avatarColor || '#7FA3D1'

  const rows = await sql`
    INSERT INTO users (user_id, display_name, avatar_color)
    VALUES (${req.userId}, ${trimmed}, ${color})
    ON CONFLICT (user_id) 
    DO UPDATE SET display_name = EXCLUDED.display_name, avatar_color = EXCLUDED.avatar_color, updated_at = NOW()
    RETURNING user_id, display_name, avatar_color
  `

  res.json({
    userId: rows[0].user_id,
    displayName: rows[0].display_name,
    avatarColor: rows[0].avatar_color,
  })
}

