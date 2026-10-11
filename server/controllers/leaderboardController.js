import User from '../models/User.js'
import { getWeeklyLeaderboard } from '../services/leaderboardService.js'
import { completedPeriodsByHabit, historyRange, loadProgressRows, scoreWeek, POINTS } from '../services/pointsService.js'
import Habit from '../models/Habit.js'
import { toDateKey, weekStart } from '../utils/dates.js'

// The browser sends ?today=YYYY-MM-DD so the week is the user's local week.
// Falls back to the server's date if it is missing or malformed.
function resolveToday(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : toDateKey()
}

// GET /api/leaderboard/weekly
export async function weeklyLeaderboard(req, res) {
  const today = resolveToday(req.query.today)
  const board = await getWeeklyLeaderboard({ today, currentUserId: req.userId })
  res.json({ ...board, rules: POINTS })
}

// GET /api/leaderboard/me — the signed-in user's own score, broken down.
export async function myScore(req, res) {
  const today = resolveToday(req.query.today)
  const weekStartKey = weekStart(today)
  const { from, to } = historyRange(weekStartKey)

  const [rows, habits] = await Promise.all([
    loadProgressRows({ from, to, userId: req.userId }),
    Habit.find({ userId: req.userId }).select('frequency').lean(),
  ])

  const breakdown = scoreWeek({
    byHabit: completedPeriodsByHabit(rows),
    weekStartKey,
    dailyHabitIds: habits.filter((h) => h.frequency !== 'weekly').map((h) => String(h._id)),
  })

  res.json({ userId: req.userId, weekStart: weekStartKey, ...breakdown, rules: POINTS })
}

// PUT /api/leaderboard/profile — set the name/colour shown on the board.
// Temporary home for this: it moves to the real profile endpoints once
// authentication and profiles land (Elnathan's scope).
export async function upsertProfile(req, res) {
  const { displayName, avatarColor } = req.body ?? {}
  if (typeof displayName !== 'string' || displayName.trim().length === 0) {
    return res.status(400).json({ message: 'displayName is required' })
  }

  const profile = await User.findOneAndUpdate(
    { userId: req.userId },
    {
      userId: req.userId,
      displayName: displayName.trim().slice(0, 60),
      ...(avatarColor ? { avatarColor } : {}),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  )

  res.json({ userId: profile.userId, displayName: profile.displayName, avatarColor: profile.avatarColor })
}
