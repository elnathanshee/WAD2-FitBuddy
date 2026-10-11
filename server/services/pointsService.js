import CheckIn from '../models/CheckIn.js'
import { addDays, weekStart } from '../utils/dates.js'

// Scoring rules. Kept in one place so the API, the tests and any future
// feature all award points identically.
export const POINTS = {
  COMPLETION: 10, // a habit's target met for a day (or for a week, if weekly)
  ALL_DAILY: 20, // every daily habit completed on the same day
  STREAK_MILESTONE: 30, // a run of completions reaching 7, 14, 21, ...
}

export const STREAK_MILESTONE_EVERY = 7

// How far back to read history. Only needed so a streak that began before this
// week is measured at its true length when it crosses a milestone.
const HISTORY_DAYS = 120

/**
 * Pulls the raw material for scoring out of MongoDB in ONE aggregation.
 *
 * The pipeline does the heavy lifting in the database rather than in Node:
 *  - $group    collapses many check-in rows into one total per user/habit/day
 *              (a habit can be logged several times a day, e.g. 2 glasses now,
 *              3 more later)
 *  - $lookup   joins each of those totals to its habit, so we know the target
 *              that day's total has to beat and whether it is daily or weekly
 *  - $project  reshapes it into flat rows the scoring rules can walk
 *
 * Returns rows of { userId, habitId, date, logged, frequency, target }.
 */
export async function loadProgressRows({ from, to, userId = null }) {
  const match = { date: { $gte: from, $lte: to } }
  if (userId) match.userId = userId

  return CheckIn.aggregate([
    { $match: match },
    {
      $group: {
        _id: { userId: '$userId', habitId: '$habitId', date: '$date' },
        logged: { $sum: '$count' },
      },
    },
    {
      $lookup: {
        from: 'habits',
        localField: '_id.habitId',
        foreignField: '_id',
        as: 'habit',
      },
    },
    { $unwind: '$habit' },
    {
      $project: {
        _id: 0,
        userId: '$_id.userId',
        habitId: { $toString: '$_id.habitId' },
        date: '$_id.date',
        logged: 1,
        frequency: '$habit.frequency',
        target: '$habit.target.amount',
      },
    },
  ])
}

/**
 * Pure function — no database access, so the rules are testable on their own.
 *
 * Turns progress rows into the periods a habit actually completed. A daily
 * habit's period is a date; a weekly habit's period is that week's Monday, and
 * its logged amounts are summed across the whole week before being compared to
 * the target. Returns Map(habitId -> { frequency, periods: sorted string[] }).
 */
export function completedPeriodsByHabit(rows) {
  const totals = new Map() // habitId -> { frequency, target, byPeriod: Map }

  for (const row of rows) {
    if (!totals.has(row.habitId)) {
      totals.set(row.habitId, { frequency: row.frequency, target: row.target, byPeriod: new Map() })
    }
    const habit = totals.get(row.habitId)
    const period = habit.frequency === 'weekly' ? weekStart(row.date) : row.date
    habit.byPeriod.set(period, (habit.byPeriod.get(period) ?? 0) + row.logged)
  }

  const result = new Map()
  for (const [habitId, habit] of totals) {
    const periods = [...habit.byPeriod.entries()]
      .filter(([, logged]) => logged >= habit.target)
      .map(([period]) => period)
      .sort()
    result.set(habitId, { frequency: habit.frequency, periods })
  }
  return result
}

/**
 * Pure function. Given a habit's completed periods (sorted), returns the
 * periods on which a streak milestone was reached — i.e. the 7th, 14th, 21st …
 * completion of an unbroken run. Awarding on the period itself is what lets the
 * weekly leaderboard say "this bonus was earned this week".
 */
export function milestonePeriods(periods, step = 1) {
  const done = new Set(periods)
  const milestones = []

  for (const period of periods) {
    if (done.has(addDays(period, -step))) continue // not the start of a run
    let length = 0
    let cursor = period
    while (done.has(cursor)) {
      length++
      if (length % STREAK_MILESTONE_EVERY === 0) milestones.push(cursor)
      cursor = addDays(cursor, step)
    }
  }
  return milestones
}

/**
 * Pure function. Scores one user's completed periods for a single week.
 *
 * Breakdown is returned alongside the total so the UI can explain a score
 * rather than just asserting it.
 */
export function scoreWeek({ byHabit, weekStartKey, dailyHabitIds }) {
  const weekEndKey = addDays(weekStartKey, 6)
  const inWeek = (period) => period >= weekStartKey && period <= weekEndKey

  let completions = 0
  let milestones = 0
  const completedDailyByDate = new Map() // date -> Set(habitId)

  for (const [habitId, { frequency, periods }] of byHabit) {
    const step = frequency === 'weekly' ? 7 : 1

    for (const period of periods) {
      if (!inWeek(period)) continue
      completions++
      if (frequency !== 'weekly') {
        if (!completedDailyByDate.has(period)) completedDailyByDate.set(period, new Set())
        completedDailyByDate.get(period).add(habitId)
      }
    }

    milestones += milestonePeriods(periods, step).filter(inWeek).length
  }

  // "Every daily habit done" bonus, counted per day of the week.
  let allDailyDays = 0
  if (dailyHabitIds.length > 0) {
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStartKey, i)
      const done = completedDailyByDate.get(date)
      if (done && dailyHabitIds.every((id) => done.has(id))) allDailyDays++
    }
  }

  const breakdown = {
    completions,
    completionPoints: completions * POINTS.COMPLETION,
    allDailyDays,
    allDailyPoints: allDailyDays * POINTS.ALL_DAILY,
    milestones,
    milestonePoints: milestones * POINTS.STREAK_MILESTONE,
  }
  breakdown.total =
    breakdown.completionPoints + breakdown.allDailyPoints + breakdown.milestonePoints

  return breakdown
}

/** The date range the scorer needs in order to measure a week correctly. */
export function historyRange(weekStartKey) {
  return { from: addDays(weekStartKey, -HISTORY_DAYS), to: addDays(weekStartKey, 6) }
}
