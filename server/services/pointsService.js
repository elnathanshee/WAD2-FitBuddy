const Habit = require('../models/Habit')
const CheckIn = require('../models/CheckIn')
const PointTransaction = require('../models/PointTransaction')
const { getStreakForHabit } = require('./streakService')
const { mondayOf } = require('./dateUtils')

// The scoring rules, kept in one place so the API, the seed script and any
// future feature all award points identically.
const POINTS = {
  CHECKIN: 10,          // every completed habit
  ALL_DAILY_BONUS: 20,  // completed every active habit that day
  STREAK_BONUS: 30,     // this habit's streak hit a multiple of 7
}

/**
 * Pure function — decides which awards a check-in earns, given facts about the
 * world. Separated from the database work so the rules can be tested directly
 * without a Mongo connection.
 */
function decideAwards({ activeHabitCount, habitsCompletedToday, currentStreak }) {
  const awards = [{ reason: 'CHECKIN', points: POINTS.CHECKIN }]

  if (activeHabitCount > 0 && habitsCompletedToday === activeHabitCount) {
    awards.push({ reason: 'ALL_DAILY_BONUS', points: POINTS.ALL_DAILY_BONUS })
  }

  if (currentStreak > 0 && currentStreak % 7 === 0) {
    awards.push({ reason: 'STREAK_BONUS', points: POINTS.STREAK_BONUS })
  }

  return awards
}

/**
 * Called immediately after a check-in is saved. Works out which bonuses apply,
 * writes one ledger row per award, and returns them so the UI can tell the user
 * exactly what they just earned ("+10 check-in, +20 all habits done!").
 */
async function awardForCheckIn({ userId, habitId, date }) {
  const activeHabits = await Habit.find({ userId, isActive: true }).select('_id').lean()
  const activeHabitIds = activeHabits.map((h) => h._id)

  // How many distinct habits has this user completed on this date?
  const completedToday = await CheckIn.distinct('habitId', {
    userId,
    date,
    habitId: { $in: activeHabitIds },
  })

  const { currentStreak } = await getStreakForHabit(habitId)

  const awards = decideAwards({
    activeHabitCount: activeHabits.length,
    habitsCompletedToday: completedToday.length,
    currentStreak,
  })

  const weekStart = mondayOf(date)
  const written = await PointTransaction.insertMany(
    awards.map((a) => ({ userId, points: a.points, reason: a.reason, weekStart }))
  )

  return {
    awards,
    totalAwarded: awards.reduce((sum, a) => sum + a.points, 0),
    currentStreak,
    written: written.length,
  }
}

module.exports = { POINTS, decideAwards, awardForCheckIn }
