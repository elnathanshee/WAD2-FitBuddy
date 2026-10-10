const CheckIn = require('../models/CheckIn')
const { todayStr, addDays, diffInDays } = require('./dateUtils')

/**
 * Pure function — no database access, so it can be unit tested directly.
 *
 * Given a habit's check-in dates (ascending "YYYY-MM-DD"), returns the current
 * and longest streak.
 *
 * currentStreak counts consecutive days ending today OR yesterday. Yesterday
 * counts because the day isn't over yet — someone who checked in yesterday but
 * hasn't yet today still has a live streak. If the most recent check-in is
 * older than that, a day was missed and the streak is broken, so it resets to 0
 * (longestStreak still remembers the best run).
 */
function computeStreak(sortedDates, today = todayStr()) {
  if (sortedDates.length === 0) return { currentStreak: 0, longestStreak: 0 }

  let longest = 1
  let run = 1
  for (let i = 1; i < sortedDates.length; i++) {
    if (diffInDays(sortedDates[i], sortedDates[i - 1]) === 1) {
      run++
    } else {
      longest = Math.max(longest, run)
      run = 1
    }
  }
  longest = Math.max(longest, run)

  const mostRecent = sortedDates[sortedDates.length - 1]
  let current = 0
  if (mostRecent === today || mostRecent === addDays(today, -1)) {
    current = 1
    for (let i = sortedDates.length - 1; i > 0; i--) {
      if (diffInDays(sortedDates[i], sortedDates[i - 1]) === 1) current++
      else break
    }
  }

  return { currentStreak: current, longestStreak: longest }
}

/** Streaks for one habit, read from the database. */
async function getStreakForHabit(habitId) {
  const checkIns = await CheckIn.find({ habitId }).sort({ date: 1 }).select('date').lean()
  return computeStreak(checkIns.map((c) => c.date))
}

module.exports = { computeStreak, getStreakForHabit }
