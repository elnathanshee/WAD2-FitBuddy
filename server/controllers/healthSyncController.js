// =============================================================================
// [IS216 Project Addition: Fitness Tracker / Health Sync Simulator]
// Technology: Express.js + Neon PostgreSQL
//
// Simulates device synchronization (Apple Health, Google Fit, Garmin)
// and updates matching daily habits automatically in Neon PostgreSQL.
// =============================================================================

import { getDb } from '../config/neon.js'
import { toDateKey } from '../utils/dates.js'

/**
 * GET /api/health-sync/today
 * Returns simulated activity metrics for the user today.
 */
export async function getTodayMetrics(req, res) {
  const sql = getDb()
  const today = toDateKey()

  // Fetch today's check-ins for user
  const checkIns = await sql`
    SELECT c.count, h.category, h.name
    FROM check_ins c
    JOIN habits h ON c.habit_id = h.id
    WHERE c.user_id = ${req.userId} AND c.date = ${today}
  `

  const hasExercise = checkIns.some((c) => c.category === 'exercise')
  const waterCount = checkIns
    .filter((c) => c.category === 'water')
    .reduce((sum, c) => sum + Number(c.count), 0)

  // Realistic synthesized activity metrics
  const baseSteps = 4200
  const bonusSteps = hasExercise ? 4800 : 1500
  const totalSteps = baseSteps + bonusSteps

  const metrics = {
    steps: totalSteps,
    stepsGoal: 10000,
    distanceKm: (totalSteps * 0.00078).toFixed(2),
    activeMinutes: hasExercise ? 45 : 20,
    activeMinutesGoal: 30,
    caloriesBurned: Math.round(totalSteps * 0.04 + (hasExercise ? 280 : 80)),
    waterGlasses: waterCount,
    waterGoal: 8,
    lastSynced: new Date().toISOString(),
  }

  res.json({ metrics })
}

/**
 * POST /api/health-sync/simulate
 * Body: { deviceType?: string, steps?: number, activeMinutes?: number, distanceKm?: number }
 * Applies simulated steps and exercise directly to user's daily habits for today.
 */
export async function simulateHealthSync(req, res) {
  const { deviceType = 'Apple Health', steps = 8500, activeMinutes = 45 } = req.body || {}
  const sql = getDb()
  const today = toDateKey()

  // 1. Fetch user's exercise or walking habits
  const userHabits = await sql`
    SELECT id, name, category, target_amount, target_unit
    FROM habits
    WHERE user_id = ${req.userId}
  `

  const updatedHabits = []

  for (const habit of userHabits) {
    const isExercise = habit.category === 'exercise' || habit.name.toLowerCase().includes('walk') || habit.name.toLowerCase().includes('run')
    const isWater = habit.category === 'water'

    let countToAdd = 0
    if (isExercise) {
      countToAdd = habit.target_unit === 'minutes' ? activeMinutes : 1
    } else if (isWater) {
      countToAdd = 8
    }

    if (countToAdd > 0) {
      await sql`
        INSERT INTO check_ins (user_id, habit_id, date, count)
        VALUES (${req.userId}, ${habit.id}, ${today}, ${countToAdd})
        ON CONFLICT (habit_id, date)
        DO UPDATE SET count = EXCLUDED.count, updated_at = NOW()
      `
      updatedHabits.push({
        id: habit.id,
        name: habit.name,
        syncedCount: countToAdd,
        unit: habit.target_unit,
      })
    }
  }

  res.json({
    message: `Successfully synchronized data from ${deviceType}!`,
    deviceType,
    syncedAt: new Date().toISOString(),
    metrics: {
      steps,
      activeMinutes,
      caloriesBurned: Math.round(steps * 0.042),
    },
    updatedHabits,
  })
}
