// Analytics calculations: completion rates, daily breakdowns and streaks for a
// day, week (Monday–Sunday) or calendar month. Pure functions with no database
// access, so tests/analytics.test.js can check every rule with plain arrays.
//
// Inputs (the controller builds these from the habits and check_ins tables):
//   habits:   [{ id, name, icon, category, frequency, target, unit, createdOn }]
//             createdOn is the 'YYYY-MM-DD' day the habit was created.
//   checkIns: [{ habitId, date, count }]
//
// Rules:
// - A daily habit is "due" once per day. It is "done" when that day's count
//   reaches the target.
// - A weekly habit is "due" once per Monday–Sunday week. It is "done" when the
//   week's total reaches the target.
// - A habit only counts from its start: the earlier of the day it was created
//   and its first check-in (seeded habits have history from before creation).
// - Days after today are never due. Today counts, so rates are "so far".
// - Completion rate = done / due, as a whole percentage (null if nothing was due).

import { toDateKey, addDays, weekStart } from './dates.js'
import { calculateStreak } from './streak.js'

// The periods the Dashboard can show
export const PERIODS = ['day', 'week', 'month']

// The first and last day of the period `offset` periods before the current one.
// ('month', '2026-10-20', -1) → { from: '2026-09-01', to: '2026-09-30' }
export function periodRange(period, today, offset = 0) {
  if (period === 'day') {
    const day = addDays(today, offset)
    return { from: day, to: day }
  }
  if (period === 'week') {
    const from = addDays(weekStart(today), offset * 7)
    return { from, to: addDays(from, 6) }
  }
  const [y, m] = today.split('-').map(Number)
  return {
    from: toDateKey(new Date(y, m - 1 + offset, 1, 12)),
    to: toDateKey(new Date(y, m + offset, 0, 12)), // day 0 = last day of the previous month
  }
}

// Completion rate as a whole percentage, or null when nothing was due
function rate(done, due) {
  return due > 0 ? Math.round((done / due) * 100) : null
}

// Every 'YYYY-MM-DD' from `from` to `to`, inclusive
function daysBetween(from, to) {
  const days = []
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day)
  return days
}

// habitId → Map(date → total count that day)
function indexCheckIns(checkIns) {
  const byHabit = new Map()
  for (const { habitId, date, count } of checkIns) {
    if (!byHabit.has(habitId)) byHabit.set(habitId, new Map())
    const days = byHabit.get(habitId)
    days.set(date, (days.get(date) ?? 0) + count)
  }
  return byHabit
}

// The day a habit starts counting: its creation day, or its earliest check-in if that is earlier
function startDate(habit, days) {
  let start = habit.createdOn
  for (const date of days.keys()) {
    if (date < start) start = date
  }
  return start
}

// Total logged for a weekly habit in the week starting `monday`, up to `end`.
function weekTotal(days, monday, end) {
  let total = 0
  for (const day of daysBetween(monday, addDays(monday, 6))) {
    if (day <= end) total += days.get(day) ?? 0
  }
  return total
}

// The Mondays of the weeks a period scores weekly habits for. A day or week
// period uses the week it falls in. A month uses the weeks that START in it,
// so a week crossing two months is counted once, in the month of its Monday.
function weeksInPeriod(period, from, end) {
  let monday = weekStart(from)
  if (period === 'month' && monday < from) monday = addDays(monday, 7)
  const mondays = []
  for (; monday <= end; monday = addDays(monday, 7)) mondays.push(monday)
  return mondays
}

// Done/due/amount for one habit over [from, end] (end is already capped at today).
function habitProgress(habit, days, period, from, end) {
  let done = 0
  let due = 0
  let amount = 0

  if (habit.frequency === 'weekly') {
    for (const monday of weeksInPeriod(period, from, end)) {
      if (addDays(monday, 6) < habit.start) continue // week ended before the habit existed
      const total = weekTotal(days, monday, end)
      due++
      amount += total
      if (total >= habit.target) done++
    }
  } else {
    const first = habit.start > from ? habit.start : from
    const daysToCount = first <= end ? daysBetween(first, end) : []
    for (const day of daysToCount) {
      const count = days.get(day) ?? 0
      due++
      amount += count
      if (count >= habit.target) done++
    }
  }
  return { done, due, amount: Math.round(amount * 100) / 100, rate: rate(done, due) }
}

// Adds up done/due over all habits for one period (`end` = the period's last day, capped at today)
function periodTotals(habits, index, period, from, to, today) {
  const end = to < today ? to : today
  const progress = habits.map((h) => habitProgress(h, index.get(h.id) ?? new Map(), period, from, end))
  const done = progress.reduce((sum, p) => sum + p.done, 0)
  const due = progress.reduce((sum, p) => sum + p.due, 0)
  return { end, progress, done, due, rate: rate(done, due) }
}

// One entry per day in [from, to], counting DAILY habits only (a weekly habit
// has no per-day target). Future days are marked and have no rate.
function daySeries(habits, index, from, to, today) {
  const daily = habits.filter((h) => h.frequency !== 'weekly')
  return daysBetween(from, to).map((date) => {
    if (date > today) return { date, done: 0, due: 0, rate: null, future: true }
    const dueHabits = daily.filter((h) => h.start <= date)
    const done = dueHabits.filter((h) => (index.get(h.id)?.get(date) ?? 0) >= h.target).length
    return { date, done, due: dueHabits.length, rate: rate(done, dueHabits.length), future: false }
  })
}

// A "perfect" day had at least one daily habit due and all of them done
function isPerfect(day) {
  return day.due > 0 && day.done === day.due
}

// Current and longest streak per habit, as of today (same rules as the Habits page).
function habitStreak(habit, days, today) {
  if (habit.frequency === 'weekly') {
    const mondays = new Set([...days.keys()].map(weekStart))
    const completed = [...mondays].filter((monday) => weekTotal(days, monday, today) >= habit.target)
    return { ...calculateStreak(completed, weekStart(today), 7), unit: 'weeks' }
  }
  const completed = [...days].filter(([, count]) => count >= habit.target).map(([date]) => date)
  return { ...calculateStreak(completed, today), unit: 'days' }
}

// Days on which every due daily habit was done, as a streak.
function perfectDayStreak(habits, index, today) {
  const starts = habits.filter((h) => h.frequency !== 'weekly').map((h) => h.start)
  if (starts.length === 0) return { current: 0, longest: 0 }
  const first = starts.reduce((a, b) => (a < b ? a : b))
  const perfect = daySeries(habits, index, first, today, today).filter(isPerfect).map((d) => d.date)
  return calculateStreak(perfect, today)
}

// Indexes the check-ins and gives each habit its `start` day
function prepare(habits, checkIns) {
  const index = indexCheckIns(checkIns)
  const prepared = habits.map((h) => ({ ...h, start: startDate(h, index.get(h.id) ?? new Map()) }))
  return { index, habits: prepared }
}

// Percentage-point change from the previous period, or null if either period had nothing due
function rateChange(currentRate, previousRate) {
  if (currentRate === null || previousRate === null) return null
  return currentRate - previousRate
}

/**
 * Everything the Analytics Dashboard shows for one period.
 * @param {{ period: 'day'|'week'|'month', today: string, offset?: number }} options
 *        offset 0 = the current period, -1 = the one before, and so on.
 */
export function buildAnalytics(rawHabits, checkIns, { period, today, offset = 0 }) {
  const { index, habits } = prepare(rawHabits, checkIns)
  const { from, to } = periodRange(period, today, offset)
  const current = periodTotals(habits, index, period, from, to, today)
  const before = periodRange(period, today, offset - 1)
  const previous = periodTotals(habits, index, period, before.from, before.to, today)
  const days = daySeries(habits, index, from, to, today)

  const categories = {}
  let checkInCount = 0
  for (const habit of habits) {
    for (const [date] of index.get(habit.id) ?? []) {
      if (date < from || date > current.end) continue
      checkInCount++
      categories[habit.category] = (categories[habit.category] ?? 0) + 1
    }
  }

  return {
    period,
    offset,
    from,
    to,
    today,
    summary: {
      completionRate: current.rate,
      done: current.done,
      due: current.due,
      previousRate: previous.rate,
      change: rateChange(current.rate, previous.rate),
      checkIns: checkInCount,
      activeHabits: habits.filter((h) => h.start <= current.end).length,
      perfectDays: days.filter(isPerfect).length,
      trackedDays: days.filter((d) => d.due > 0).length,
    },
    days,
    habits: habits.map((h, i) => ({
      id: h.id,
      name: h.name,
      icon: h.icon,
      category: h.category,
      frequency: h.frequency,
      target: h.target,
      unit: h.unit,
      ...current.progress[i],
      streak: habitStreak(h, index.get(h.id) ?? new Map(), today),
    })),
    categories,
    perfectDayStreak: perfectDayStreak(habits, index, today),
  }
}

/**
 * The older 7-day summary (GET /api/analytics/weekly-summary): the last 7 days
 * ending today, in the response shape the endpoint has always returned.
 */
export function buildWeeklySummary(rawHabits, checkIns, today) {
  const { index, habits } = prepare(rawHabits, checkIns)
  const from = addDays(today, -6)
  const days = daySeries(habits, index, from, today, today)
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const categoryCount = {}
  let totalCheckIns = 0
  for (const habit of habits) {
    for (const [date] of index.get(habit.id) ?? []) {
      if (date < from || date > today) continue
      totalCheckIns++
      categoryCount[habit.category] = (categoryCount[habit.category] ?? 0) + 1
    }
  }

  const done = days.reduce((sum, d) => sum + d.done, 0)
  const due = days.reduce((sum, d) => sum + d.due, 0)
  return {
    days: days.map((d) => ({
      date: d.date,
      day: names[new Date(`${d.date}T12:00:00`).getDay()],
      completed: d.done,
      total: d.due,
      percentage: d.rate ?? 0,
    })),
    overallCompletionRate: rate(done, due) ?? 0,
    totalCheckIns,
    activeHabitsCount: habits.length,
    categoryCount,
  }
}
