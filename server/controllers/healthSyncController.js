// Handlers for /api/health-sync: simulated Google Health wearable activity data
// (steps, active minutes, distance, calories) and automatic habit check-in sync.

import { getDb } from '../config/neon.js'
import { toDateKey, resolveToday } from '../utils/dates.js'

const STEPS_GOAL = 10000
const ACTIVE_MINUTES_GOAL = 30
const STEP_HABIT_PATTERN = /\b(step|steps|walk|walking|run|running|jog|jogging)\b/i
const ACTIVE_HABIT_PATTERN = /\b(workout|exercise|gym|training|active|cardio|yoga|stretch|cycling|swim)\b/i

// Per-user simulated state in memory (connected by default; stores simulated sync boosts for today)
const disconnectedUsers = new Set()
const userSyncBoosts = new Map() // key: `${userId}:${today}` -> { steps, activeMinutes, lastSynced, connectedAt }

const SIMULATED_PRESETS = {
  default: { label: 'Daily activity sync', steps: 1850, activeMinutes: 12 },
  walk: { label: 'Brisk walk (20 min)', steps: 2400, activeMinutes: 20 },
  run: { label: '5K outdoor run', steps: 5200, activeMinutes: 30 },
  workout: { label: 'Gym / HIIT session', steps: 1600, activeMinutes: 35 },
}

function getBoostState(userId, today) {
  const key = `${userId}:${today}`
  if (!userSyncBoosts.has(key)) {
    userSyncBoosts.set(key, {
      steps: 0,
      activeMinutes: 0,
      connectedAt: new Date().toISOString(),
      lastSynced: new Date().toISOString(),
    })
  }
  return userSyncBoosts.get(key)
}

async function getCompletedHabitsTodayCount(userId, today) {
  try {
    const sql = getDb()
    const rows = await sql`
      SELECT COUNT(*)::int AS cnt
      FROM check_ins
      WHERE user_id = ${userId} AND date = ${today} AND count > 0
    `
    return rows[0]?.cnt ?? 0
  } catch {
    return 0
  }
}

async function buildSimulatedMetrics(userId, today = toDateKey()) {
  const boost = getBoostState(userId, today)
  const completedCount = await getCompletedHabitsTodayCount(userId, today)

  const steps = Math.min(30000, 5420 + completedCount * 1250 + boost.steps)
  const activeMinutes = Math.min(240, 22 + completedCount * 8 + boost.activeMinutes)
  const distanceKm = Number((steps * 0.00076).toFixed(2))
  const caloriesBurned = Math.round(steps * 0.042 + activeMinutes * 4.5)

  return {
    steps,
    stepsGoal: STEPS_GOAL,
    activeMinutes,
    activeMinutesGoal: ACTIVE_MINUTES_GOAL,
    distanceKm,
    caloriesBurned,
    lastSynced: boost.lastSynced,
    source: 'Google Health (Simulated)',
    simulated: true,
  }
}

function roundAmount(value) {
  return Math.round(value * 100) / 100
}

function normalizeUnit(unit) {
  return String(unit || '').trim().toLowerCase()
}

function mappedHabitAmount(habit, metrics) {
  const unit = normalizeUnit(habit.target_unit)
  const name = String(habit.name || '')
  const category = String(habit.category || '').toLowerCase()
  const isExerciseHabit = category === 'exercise' || STEP_HABIT_PATTERN.test(name) || ACTIVE_HABIT_PATTERN.test(name)
  if (!isExerciseHabit) return null

  if (unit === 'steps') {
    return metrics.steps > 0 ? metrics.steps : null
  }
  if (unit === 'km') {
    return metrics.distanceKm > 0 ? roundAmount(metrics.distanceKm) : null
  }
  if (unit === 'miles') {
    return metrics.distanceKm > 0 ? roundAmount(metrics.distanceKm * 0.621371) : null
  }
  if (unit === 'metres' || unit === 'meters') {
    return metrics.distanceKm > 0 ? Math.round(metrics.distanceKm * 1000) : null
  }
  if (unit === 'minutes') {
    return metrics.activeMinutes > 0 ? metrics.activeMinutes : null
  }
  if (unit === 'hours') {
    return metrics.activeMinutes > 0 ? roundAmount(metrics.activeMinutes / 60) : null
  }
  if (unit === 'kcal') {
    return metrics.caloriesBurned > 0 ? metrics.caloriesBurned : null
  }

  const targetAmount = Number(habit.target_amount) || 1
  if (STEP_HABIT_PATTERN.test(name) && metrics.steps >= 6000) {
    return targetAmount
  }
  if (metrics.activeMinutes >= 20 || metrics.steps >= 7000) {
    return targetAmount
  }
  return null
}

async function syncHabitsFromMetrics(userId, metrics, today = toDateKey()) {
  const sql = getDb()
  const habits = await sql`
    SELECT id, name, category, target_amount, target_unit
    FROM habits
    WHERE user_id = ${userId}
  `

  const updatedHabits = []
  for (const habit of habits) {
    const mappedAmount = mappedHabitAmount(habit, metrics)
    if (!mappedAmount || mappedAmount <= 0) continue

    const existing = await sql`
      SELECT count
      FROM check_ins
      WHERE user_id = ${userId} AND habit_id = ${habit.id} AND date = ${today}
      LIMIT 1
    `
    const nextCount = Math.max(Number(existing[0]?.count ?? 0), roundAmount(mappedAmount))

    await sql`
      INSERT INTO check_ins (user_id, habit_id, date, count)
      VALUES (${userId}, ${habit.id}, ${today}, ${nextCount})
      ON CONFLICT (habit_id, date)
      DO UPDATE SET count = GREATEST(check_ins.count, EXCLUDED.count), updated_at = NOW()
    `

    updatedHabits.push({
      id: habit.id,
      name: habit.name,
      syncedCount: nextCount,
      unit: habit.target_unit,
    })
  }

  return updatedHabits
}

// GET /api/health-sync/google/status
export async function getGoogleHealthStatus(req, res) {
  const userId = String(req.userId)
  const today = resolveToday(req.query?.today ?? req.body?.today)
  const connected = !disconnectedUsers.has(userId)
  const boost = getBoostState(userId, today)

  res.json({
    configured: true,
    simulated: true,
    missingConfig: [],
    connected,
    connectedAt: connected ? boost.connectedAt : null,
    lastSyncedAt: connected ? boost.lastSynced : null,
    lastSyncError: '',
  })
}

// GET or POST /api/health-sync/google/connect
export async function startGoogleHealthConnect(req, res) {
  const userId = String(req.userId)
  const today = resolveToday(req.body?.today ?? req.query?.today)
  disconnectedUsers.delete(userId)
  const boost = getBoostState(userId, today)
  boost.connectedAt = new Date().toISOString()
  boost.lastSynced = boost.connectedAt
  const metrics = await buildSimulatedMetrics(userId, today)

  res.json({
    connected: true,
    simulated: true,
    metrics,
    message: 'Connected to simulated Google Health data.',
  })
}

// GET /api/health-sync/google/callback
export async function googleHealthCallback(_req, res) {
  res.redirect('/home?googleHealth=connected')
}

// GET /api/health-sync/today
export async function getTodayMetrics(req, res) {
  const userId = String(req.userId)
  const today = resolveToday(req.query?.today ?? req.body?.today)
  const connected = !disconnectedUsers.has(userId)
  if (!connected) {
    return res.json({
      connected: false,
      simulated: true,
      metrics: null,
      lastSyncError: '',
    })
  }

  const metrics = await buildSimulatedMetrics(userId, today)
  res.json({
    connected: true,
    simulated: true,
    metrics,
    lastSyncError: '',
  })
}

// POST /api/health-sync/google/sync
export async function syncGoogleHealth(req, res) {
  const userId = String(req.userId)
  const today = resolveToday(req.body?.today ?? req.query?.today)
  disconnectedUsers.delete(userId)

  const presetKey = String(req.body?.preset || 'default')
  const preset = SIMULATED_PRESETS[presetKey] || SIMULATED_PRESETS.default
  const boost = getBoostState(userId, today)

  if (req.body?.reset) {
    boost.steps = 0
    boost.activeMinutes = 0
  } else {
    boost.steps += preset.steps
    boost.activeMinutes += preset.activeMinutes
  }
  boost.lastSynced = new Date().toISOString()

  const metrics = await buildSimulatedMetrics(userId, today)
  const updatedHabits = await syncHabitsFromMetrics(userId, metrics, today)

  res.json({
    connected: true,
    simulated: true,
    preset: preset.label,
    metrics,
    updatedHabits,
    message: updatedHabits.length
      ? `Synced simulated Google Health activity and updated ${updatedHabits.length} habit(s).`
      : 'Synced simulated Google Health activity for today.',
  })
}

// DELETE /api/health-sync/google/connection
export async function disconnectGoogleHealth(req, res) {
  const userId = String(req.userId)
  disconnectedUsers.add(userId)
  res.json({
    connected: false,
    simulated: true,
    message: 'Simulated Google Health feed paused.',
  })
}
