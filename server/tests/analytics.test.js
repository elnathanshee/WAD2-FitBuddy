// Unit tests for utils/analytics.js — run with `npm test` from the server folder.
// Every test fixes `today`, so results never depend on the real date.
// TODAY is a Thursday; its week runs Mon 2026-10-12 to Sun 2026-10-18.
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
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
  test('day → just that day, offset moves back one day at a time', () => {
    assert.deepEqual(periodRange('day', TODAY), { from: TODAY, to: TODAY })
    assert.deepEqual(periodRange('day', TODAY, -1), { from: '2026-10-14', to: '2026-10-14' })
  })

  test('week → Monday to Sunday', () => {
    assert.deepEqual(periodRange('week', TODAY), { from: '2026-10-12', to: '2026-10-18' })
    assert.deepEqual(periodRange('week', TODAY, -1), { from: '2026-10-05', to: '2026-10-11' })
  })

  test('month → first to last day of the calendar month', () => {
    assert.deepEqual(periodRange('month', TODAY), { from: '2026-10-01', to: '2026-10-31' })
    assert.deepEqual(periodRange('month', TODAY, -1), { from: '2026-09-01', to: '2026-09-30' })
  })

  test('month offset crosses a year boundary', () => {
    assert.deepEqual(periodRange('month', '2026-01-10', -1), { from: '2025-12-01', to: '2025-12-31' })
  })

  test('February in a leap year has 29 days', () => {
    assert.deepEqual(periodRange('month', '2028-02-10'), { from: '2028-02-01', to: '2028-02-29' })
  })
})

describe('buildAnalytics — daily habits', () => {
  const habits = [habit()]
  const checkIns = [
    checkIn(1, '2026-10-13', 2), // target met
    checkIn(1, '2026-10-14', 3), // over target still counts once
    checkIn(1, '2026-10-15', 1), // today, not met yet
  ]

  test('week rate counts each day up to today: 2 done of 4 due → 50%', () => {
    const { summary } = buildAnalytics(habits, checkIns, { period: 'week', today: TODAY })
    assert.equal(summary.done, 2)
    assert.equal(summary.due, 4)
    assert.equal(summary.completionRate, 50)
  })

  test('the week lists all 7 days; days after today are future with no rate', () => {
    const { days } = buildAnalytics(habits, checkIns, { period: 'week', today: TODAY })
    assert.equal(days.length, 7)
    assert.deepEqual(days.map((d) => d.future), [false, false, false, false, true, true, true])
    assert.equal(days[6].rate, null)
    assert.equal(days[1].rate, 100) // Tue 13th
    assert.equal(days[3].rate, 0) // today, 1 of 2 glasses
  })

  test('day view: only that day counts', () => {
    const result = buildAnalytics(habits, checkIns, { period: 'day', today: TODAY, offset: -1 })
    assert.equal(result.summary.completionRate, 100)
    assert.equal(result.habits[0].amount, 3)
  })

  test('change compares with the previous period', () => {
    // Previous week (Oct 5–11): nothing done → 0%. This week 50% → +50.
    const { summary } = buildAnalytics(habits, checkIns, { period: 'week', today: TODAY })
    assert.equal(summary.previousRate, 0)
    assert.equal(summary.change, 50)
  })

  test('a habit created mid-month is not due before it existed', () => {
    const late = [habit({ createdOn: '2026-10-14' })]
    const { summary } = buildAnalytics(late, checkIns, { period: 'month', today: TODAY })
    // Due on the first check-in day (13th) through today: 13, 14, 15
    assert.equal(summary.due, 3)
  })

  test('a check-in before the creation day moves the start earlier (seeded history)', () => {
    const seeded = [habit({ createdOn: '2026-10-15' })]
    const { summary } = buildAnalytics(seeded, [checkIn(1, '2026-10-10', 2)], { period: 'month', today: TODAY })
    assert.equal(summary.due, 6) // 10th to 15th
    assert.equal(summary.done, 1)
  })

  test('perfect days need every due daily habit done', () => {
    const two = [habit(), habit({ id: 2, name: 'Read', category: 'study', target: 1 })]
    const logs = [...checkIns, checkIn(2, '2026-10-13', 1)]
    const { summary } = buildAnalytics(two, logs, { period: 'week', today: TODAY })
    assert.equal(summary.perfectDays, 1) // only the 13th has both
    assert.equal(summary.trackedDays, 4)
  })
})

describe('buildAnalytics — weekly habits', () => {
  const gym = habit({ id: 7, name: 'Gym', category: 'exercise', frequency: 'weekly', target: 3, unit: 'sessions' })
  const checkIns = [
    checkIn(7, '2026-09-29', 3), // week of Mon Sep 28 — starts in September
    checkIn(7, '2026-10-05', 1),
    checkIn(7, '2026-10-08', 2), // week of Oct 5 totals 3 → done
  ]

  test('a month scores the weeks that start in it, up to today', () => {
    // Weeks starting Oct 5 (done) and Oct 12 (nothing yet). Sep 28 belongs to September.
    const { summary } = buildAnalytics([gym], checkIns, { period: 'month', today: TODAY })
    assert.equal(summary.due, 2)
    assert.equal(summary.done, 1)
    assert.equal(summary.completionRate, 50)
  })

  test('a week period scores just that week', () => {
    const { summary } = buildAnalytics([gym], checkIns, { period: 'week', today: TODAY, offset: -1 })
    assert.equal(summary.completionRate, 100)
  })

  test('weekly habits are left out of the per-day series', () => {
    const { days } = buildAnalytics([gym], checkIns, { period: 'week', today: TODAY })
    assert.ok(days.every((d) => d.due === 0 && d.rate === null))
  })

  test('streak is counted in weeks', () => {
    const { habits } = buildAnalytics([gym], checkIns, { period: 'week', today: TODAY })
    assert.deepEqual(habits[0].streak, { current: 2, longest: 2, unit: 'weeks' })
  })
})

describe('buildAnalytics — streaks and totals', () => {
  test('daily streak uses the grace rule (today not done yet)', () => {
    const logs = ['2026-10-12', '2026-10-13', '2026-10-14'].map((d) => checkIn(1, d, 2))
    const { habits, perfectDayStreak } = buildAnalytics([habit()], logs, { period: 'week', today: TODAY })
    assert.deepEqual(habits[0].streak, { current: 3, longest: 3, unit: 'days' })
    assert.deepEqual(perfectDayStreak, { current: 3, longest: 3 })
  })

  test('check-ins are counted per category within the period', () => {
    const habits = [habit(), habit({ id: 2, category: 'study' })]
    const logs = [checkIn(1, '2026-10-13', 1), checkIn(2, '2026-10-14', 1), checkIn(2, '2026-09-01', 1)]
    const { categories, summary } = buildAnalytics(habits, logs, { period: 'month', today: TODAY })
    assert.deepEqual(categories, { water: 1, study: 1 })
    assert.equal(summary.checkIns, 2)
  })

  test('no habits → rates are null, not 0% or NaN', () => {
    const { summary, perfectDayStreak } = buildAnalytics([], [], { period: 'month', today: TODAY })
    assert.equal(summary.completionRate, null)
    assert.equal(summary.change, null)
    assert.deepEqual(perfectDayStreak, { current: 0, longest: 0 })
  })
})

describe('buildWeeklySummary', () => {
  test('last 7 days ending today, with weekday names', () => {
    const result = buildWeeklySummary([habit()], [checkIn(1, '2026-10-15', 2)], TODAY)
    assert.equal(result.days.length, 7)
    assert.equal(result.days[0].date, '2026-10-09')
    assert.equal(result.days[6].day, 'Thu')
    assert.equal(result.days[6].percentage, 100)
    assert.equal(result.overallCompletionRate, 14) // 1 of 7
  })
})
