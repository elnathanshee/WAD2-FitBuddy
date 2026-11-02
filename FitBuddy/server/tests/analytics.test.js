// Unit tests for utils/analytics.js — run with `npm test` from the server folder.
// Every test fixes `today`, so results never depend on the real date.
// TODAY is a Thursday; its week runs Mon 2026-10-12 to Sun 2026-10-18.
import { describe, it, expect } from 'vitest'
import { periodRange, buildAnalytics, buildWeeklySummary } from '../utils/analytics.js'

const TODAY = '2026-10-15'

function habit(fields) {
  return {
    id: 1,
    name: 'Drink water',
    icon: '💧',
    category: 'water',
    frequency: 'daily',
    target: 2,
    unit: 'glasses',
    createdOn: '2026-09-01',
    ...fields,
  }
}

const checkIn = (habitId, date, count) => ({ habitId, date, count })

describe('periodRange', () => {
  it('day → just that day, offset moves back one day at a time', () => {
    expect(periodRange('day', TODAY)).toEqual({ from: TODAY, to: TODAY })
    expect(periodRange('day', TODAY, -1)).toEqual({ from: '2026-10-14', to: '2026-10-14' })
  })

  it('week → Monday to Sunday', () => {
    expect(periodRange('week', TODAY)).toEqual({ from: '2026-10-12', to: '2026-10-18' })
    expect(periodRange('week', TODAY, -1)).toEqual({ from: '2026-10-05', to: '2026-10-11' })
  })

  it('month → first to last day of the calendar month', () => {
    expect(periodRange('month', TODAY)).toEqual({ from: '2026-10-01', to: '2026-10-31' })
    expect(periodRange('month', TODAY, -1)).toEqual({ from: '2026-09-01', to: '2026-09-30' })
  })

  it('month offset crosses a year boundary', () => {
    expect(periodRange('month', '2026-01-10', -1)).toEqual({ from: '2025-12-01', to: '2025-12-31' })
  })

  it('February in a leap year has 29 days', () => {
    expect(periodRange('month', '2028-02-10')).toEqual({ from: '2028-02-01', to: '2028-02-29' })
  })
})

describe('buildAnalytics — daily habits', () => {
  const habits = [habit()]
  const checkIns = [
    checkIn(1, '2026-10-13', 2), // target met
    checkIn(1, '2026-10-14', 3), // over target still counts once
    checkIn(1, '2026-10-15', 1), // today, not met yet
  ]

  it('week rate counts each day up to today: 2 done of 4 due → 50%', () => {
    const { summary } = buildAnalytics(habits, checkIns, { period: 'week', today: TODAY })
    expect(summary.done).toBe(2)
    expect(summary.due).toBe(4)
    expect(summary.completionRate).toBe(50)
  })

  it('the week lists all 7 days; days after today are future with no rate', () => {
    const { days } = buildAnalytics(habits, checkIns, { period: 'week', today: TODAY })
    expect(days).toHaveLength(7)
    expect(days.map((d) => d.future)).toEqual([false, false, false, false, true, true, true])
    expect(days[6].rate).toBe(null)
    expect(days[1].rate).toBe(100) // Tue 13th
    expect(days[3].rate).toBe(0) // today, 1 of 2 glasses
  })

  it('day view: only that day counts', () => {
    const result = buildAnalytics(habits, checkIns, { period: 'day', today: TODAY, offset: -1 })
    expect(result.summary.completionRate).toBe(100)
    expect(result.habits[0].amount).toBe(3)
  })

  it('change compares with the previous period', () => {
    // Previous week (Oct 5–11): nothing done → 0%. This week 50% → +50.
    const { summary } = buildAnalytics(habits, checkIns, { period: 'week', today: TODAY })
    expect(summary.previousRate).toBe(0)
    expect(summary.change).toBe(50)
  })

  it('a habit created mid-month is not due before it existed', () => {
    const late = [habit({ createdOn: '2026-10-14' })]
    const { summary } = buildAnalytics(late, checkIns, { period: 'month', today: TODAY })
    // Due on the first check-in day (13th) through today: 13, 14, 15
    expect(summary.due).toBe(3)
  })

  it('a check-in before the creation day moves the start earlier (seeded history)', () => {
    const seeded = [habit({ createdOn: '2026-10-15' })]
    const { summary } = buildAnalytics(seeded, [checkIn(1, '2026-10-10', 2)], { period: 'month', today: TODAY })
    expect(summary.due).toBe(6) // 10th to 15th
    expect(summary.done).toBe(1)
  })

  it('perfect days need every due daily habit done', () => {
    const two = [habit(), habit({ id: 2, name: 'Read', category: 'study', target: 1 })]
    const logs = [...checkIns, checkIn(2, '2026-10-13', 1)]
    const { summary } = buildAnalytics(two, logs, { period: 'week', today: TODAY })
    expect(summary.perfectDays).toBe(1) // only the 13th has both
    expect(summary.trackedDays).toBe(4)
  })
})

describe('buildAnalytics — weekly habits', () => {
  const gym = habit({ id: 7, name: 'Gym', category: 'exercise', frequency: 'weekly', target: 3, unit: 'sessions' })
  const checkIns = [
    checkIn(7, '2026-09-29', 3), // week of Mon Sep 28 — starts in September
    checkIn(7, '2026-10-05', 1),
    checkIn(7, '2026-10-08', 2), // week of Oct 5 totals 3 → done
  ]

  it('a month scores the weeks that start in it, up to today', () => {
    // Weeks starting Oct 5 (done) and Oct 12 (nothing yet). Sep 28 belongs to September.
    const { summary } = buildAnalytics([gym], checkIns, { period: 'month', today: TODAY })
    expect(summary.due).toBe(2)
    expect(summary.done).toBe(1)
    expect(summary.completionRate).toBe(50)
  })

  it('a week period scores just that week', () => {
    const { summary } = buildAnalytics([gym], checkIns, { period: 'week', today: TODAY, offset: -1 })
    expect(summary.completionRate).toBe(100)
  })

  it('weekly habits are left out of the per-day series', () => {
    const { days } = buildAnalytics([gym], checkIns, { period: 'week', today: TODAY })
    expect(days.every((d) => d.due === 0 && d.rate === null)).toBeTruthy()
  })

  it('streak is counted in weeks', () => {
    const { habits } = buildAnalytics([gym], checkIns, { period: 'week', today: TODAY })
    expect(habits[0].streak).toEqual({ current: 2, longest: 2, unit: 'weeks' })
  })
})

describe('buildAnalytics — streaks and totals', () => {
  it('daily streak uses the grace rule (today not done yet)', () => {
    const logs = ['2026-10-12', '2026-10-13', '2026-10-14'].map((d) => checkIn(1, d, 2))
    const { habits, perfectDayStreak } = buildAnalytics([habit()], logs, { period: 'week', today: TODAY })
    expect(habits[0].streak).toEqual({ current: 3, longest: 3, unit: 'days' })
    expect(perfectDayStreak).toEqual({ current: 3, longest: 3 })
  })

  it('check-ins are counted per category within the period', () => {
    const habits = [habit(), habit({ id: 2, category: 'study' })]
    const logs = [checkIn(1, '2026-10-13', 1), checkIn(2, '2026-10-14', 1), checkIn(2, '2026-09-01', 1)]
    const { categories, summary } = buildAnalytics(habits, logs, { period: 'month', today: TODAY })
    expect(categories).toEqual({ water: 1, study: 1 })
    expect(summary.checkIns).toBe(2)
  })

  it('no habits → rates are null, not 0% or NaN', () => {
    const { summary, perfectDayStreak } = buildAnalytics([], [], { period: 'month', today: TODAY })
    expect(summary.completionRate).toBe(null)
    expect(summary.change).toBe(null)
    expect(perfectDayStreak).toEqual({ current: 0, longest: 0 })
  })
})

describe('buildWeeklySummary', () => {
  it('last 7 days ending today, with weekday names', () => {
    const result = buildWeeklySummary([habit()], [checkIn(1, '2026-10-15', 2)], TODAY)
    expect(result.days).toHaveLength(7)
    expect(result.days[0].date).toBe('2026-10-09')
    expect(result.days[6].day).toBe('Thu')
    expect(result.days[6].percentage).toBe(100)
    expect(result.overallCompletionRate).toBe(14) // 1 of 7
  })
})
