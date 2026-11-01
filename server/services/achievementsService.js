// =============================================================================
// [IS216 Project Addition: Achievements / Badges]
// Technology: plain JavaScript only - this file never touches the database.
//
// Badges are DERIVED from the check-in history, exactly like points and streaks
// are. Nothing is stored, so a badge can never disagree with the data behind it:
// undo a check-in and the badge goes away again by itself.
//
// Everything here is a pure function (plain values in, plain values out), so
// tests/achievements.test.js can check every rule without a database.
// =============================================================================

import { POINTS, milestonePeriods } from './pointsService.js'
import { calculateStreak } from '../utils/streak.js'
import { weekStart } from '../utils/dates.js'

// The badge catalogue.
//   stat   - the name of a number in the stats object built by buildStats()
//   target - how big that number has to be before the badge is earned
// Adding a badge means adding one line here. Nothing else changes.
export const BADGES = [
  { id: 'first-step', name: 'First Step', icon: '👟', group: 'Consistency', description: 'Complete a habit for the first time', stat: 'completions', target: 1 },
  { id: 'getting-going', name: 'Getting Going', icon: '🌱', group: 'Consistency', description: 'Complete 10 habit days', stat: 'completions', target: 10 },
  { id: 'half-century', name: 'Half Century', icon: '🏅', group: 'Consistency', description: 'Complete 50 habit days', stat: 'completions', target: 50 },
  { id: 'centurion', name: 'Centurion', icon: '💯', group: 'Consistency', description: 'Complete 100 habit days', stat: 'completions', target: 100 },

  { id: 'week-warrior', name: 'Week Warrior', icon: '🔥', group: 'Streaks', description: 'Reach a 7 day streak', stat: 'longestStreak', target: 7 },
  { id: 'fortnight', name: 'Fortnight', icon: '⚡', group: 'Streaks', description: 'Reach a 14 day streak', stat: 'longestStreak', target: 14 },
  { id: 'unstoppable', name: 'Unstoppable', icon: '🚀', group: 'Streaks', description: 'Reach a 30 day streak', stat: 'longestStreak', target: 30 },

  { id: 'perfect-day', name: 'Perfect Day', icon: '✨', group: 'Perfect days', description: 'Finish every daily habit in one day', stat: 'perfectDays', target: 1 },
  { id: 'perfect-seven', name: 'Lucky Seven', icon: '🌟', group: 'Perfect days', description: 'Finish every daily habit on 7 days', stat: 'perfectDays', target: 7 },

  { id: 'point-scorer', name: 'Point Scorer', icon: '🎯', group: 'Points', description: 'Earn 500 points in total', stat: 'totalPoints', target: 500 },
  { id: 'high-roller', name: 'High Roller', icon: '👑', group: 'Points', description: 'Earn 2,000 points in total', stat: 'totalPoints', target: 2000 },

  { id: 'team-player', name: 'Team Player', icon: '🤝', group: 'Friends', description: 'Make 3 friends', stat: 'friends', target: 3 },
]

/**
 * Adds up everything the badges need, from the whole of a user's history.
 *
 * @param {Map}      byHabit        habitId -> { frequency, periods } from
 *                                  completedPeriodsByHabit() in pointsService.js
 * @param {string[]} dailyHabitIds  ids of this user's daily (not weekly) habits
 * @param {string}   today          'YYYY-MM-DD', the user's local today
 * @param {number}   friendCount    how many accepted friends the user has
 * @returns {{ completions, perfectDays, milestones, longestStreak, totalPoints, friends }}
 */
export function buildStats({ byHabit, dailyHabitIds = [], today, friendCount = 0 }) {
  let completions = 0
  let milestones = 0
  let longestStreak = 0
  const completedDailyByDate = new Map() // date -> Set of daily habit ids done that day

  for (const [habitId, habit] of byHabit) {
    // A weekly habit's periods are Mondays, so its steps are 7 days apart
    const step = habit.frequency === 'weekly' ? 7 : 1
    const currentPeriod = habit.frequency === 'weekly' ? weekStart(today) : today

    completions += habit.periods.length
    milestones += milestonePeriods(habit.periods, step).length

    // calculateStreak returns { current, longest }; badges only use the longest
    const streak = calculateStreak(habit.periods, currentPeriod, step)
    if (streak.longest > longestStreak) longestStreak = streak.longest

    if (habit.frequency !== 'weekly') {
      for (const date of habit.periods) {
        if (!completedDailyByDate.has(date)) completedDailyByDate.set(date, new Set())
        completedDailyByDate.get(date).add(habitId)
      }
    }
  }

  // A "perfect day" is a day where EVERY daily habit was completed - the same
  // rule the weekly points bonus uses (see scoreWeek in pointsService.js).
  let perfectDays = 0
  if (dailyHabitIds.length > 0) {
    for (const doneThatDay of completedDailyByDate.values()) {
      if (dailyHabitIds.every((id) => doneThatDay.has(id))) perfectDays++
    }
  }

  // Lifetime points, using the same three rules as the weekly leaderboard
  const totalPoints =
    completions * POINTS.COMPLETION +
    perfectDays * POINTS.ALL_DAILY +
    milestones * POINTS.STREAK_MILESTONE

  return { completions, perfectDays, milestones, longestStreak, totalPoints, friends: friendCount }
}

/**
 * Turns the stats into the list the page shows: every badge, earned or not,
 * with how far along the user is so a locked badge can show a progress bar.
 */
export function evaluateBadges(stats) {
  return BADGES.map((badge) => {
    const value = stats[badge.stat] ?? 0
    return {
      ...badge,
      value,
      earned: value >= badge.target,
      // Capped at 100 so an earned badge never shows 340%
      percent: Math.min(100, Math.round((value / badge.target) * 100)),
    }
  })
}
