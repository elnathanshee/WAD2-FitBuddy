import Habit from '../models/Habit.js'
import User from '../models/User.js'
import { addDays, weekStart } from '../utils/dates.js'
import { completedPeriodsByHabit, historyRange, loadProgressRows, scoreWeek } from './pointsService.js'

/**
 * Builds the weekly leaderboard.
 *
 * Why points are DERIVED from check-ins rather than banked in a ledger table:
 * the check-ins are already the record of what happened, so recomputing from
 * them means a score can never drift out of step with the habits it came from,
 * and no part of the habit code has to remember to award anything. The weekly
 * "reset" is just which week we score — nothing is ever deleted, so last
 * week's board (or an all-time view) stays computable.
 *
 * `today` comes from the browser so the week is the user's local week, the
 * same convention the habit endpoints already use.
 */
export async function getWeeklyLeaderboard({ today, currentUserId = null }) {
  const weekStartKey = weekStart(today)
  const weekEndKey = addDays(weekStartKey, 6)
  const { from, to } = historyRange(weekStartKey)

  const [rows, habits, profiles] = await Promise.all([
    loadProgressRows({ from, to }),
    Habit.find().select('userId frequency').lean(),
    User.find().lean(),
  ])

  // Everyone we know about: anyone with a profile, a habit, or a check-in.
  // Starting from the people rather than from the scores means someone on zero
  // points this week still appears on the board — they are exactly who a
  // leaderboard is meant to nudge.
  const userIds = new Set([
    ...profiles.map((p) => p.userId),
    ...habits.map((h) => h.userId),
    ...rows.map((r) => r.userId),
  ])

  const rowsByUser = new Map()
  for (const row of rows) {
    if (!rowsByUser.has(row.userId)) rowsByUser.set(row.userId, [])
    rowsByUser.get(row.userId).push(row)
  }

  const dailyHabitsByUser = new Map()
  for (const habit of habits) {
    if (habit.frequency === 'weekly') continue
    if (!dailyHabitsByUser.has(habit.userId)) dailyHabitsByUser.set(habit.userId, [])
    dailyHabitsByUser.get(habit.userId).push(String(habit._id))
  }

  const profileByUser = new Map(profiles.map((p) => [p.userId, p]))

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
      displayName: profile?.displayName ?? `User ${userId}`,
      avatarColor: profile?.avatarColor ?? '#7FA3D1',
      points: breakdown.total,
      breakdown,
      isCurrentUser: currentUserId != null && String(userId) === String(currentUserId),
    }
  })

  // Highest first; ties broken by name so the order is stable between reloads.
  scored.sort((a, b) => b.points - a.points || a.displayName.localeCompare(b.displayName))

  // Competition ranking: two users on 90 are both 1st, the next is 3rd.
  let rank = 0
  let previousPoints = null
  const entries = scored.map((entry, index) => {
    if (entry.points !== previousPoints) {
      rank = index + 1
      previousPoints = entry.points
    }
    return { ...entry, rank }
  })

  return { weekStart: weekStartKey, weekEnd: weekEndKey, entries }
}
