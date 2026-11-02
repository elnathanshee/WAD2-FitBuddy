// Tests for the scoring rules. These cover the pure functions only, so they
// need no database and no network.
import { it, expect } from 'vitest'
import {
  POINTS,
  completedPeriodsByHabit,
  milestonePeriods,
  scoreWeek,
} from '../services/pointsService.js'

// Monday 2026-10-05 .. Sunday 2026-10-11
const WEEK = '2026-10-05'

function row(overrides) {
  return { userId: '1', habitId: 'h1', date: WEEK, logged: 1, frequency: 'daily', target: 1, ...overrides }
}

it('a daily habit counts only on days that reach the target', () => {
  const byHabit = completedPeriodsByHabit([
    row({ date: '2026-10-05', logged: 8, target: 8 }),
    row({ date: '2026-10-06', logged: 5, target: 8 }), // short of target
    row({ date: '2026-10-07', logged: 9, target: 8 }),
  ])
  expect(byHabit.get('h1').periods).toEqual(['2026-10-05', '2026-10-07'])
})

it('several logs on the same day are added together before comparing', () => {
  const byHabit = completedPeriodsByHabit([
    row({ date: '2026-10-05', logged: 3, target: 8 }),
    row({ date: '2026-10-05', logged: 5, target: 8 }),
  ])
  expect(byHabit.get('h1').periods, '3 + 5 meets a target of 8').toEqual(['2026-10-05'])
})

it('a weekly habit is summed across the week and keyed by its Monday', () => {
  const byHabit = completedPeriodsByHabit([
    row({ frequency: 'weekly', target: 3, date: '2026-10-06', logged: 1 }),
    row({ frequency: 'weekly', target: 3, date: '2026-10-08', logged: 1 }),
    row({ frequency: 'weekly', target: 3, date: '2026-10-11', logged: 1 }),
  ])
  expect(byHabit.get('h1').periods, 'three sessions in one week meets a weekly target of 3').toEqual([WEEK])
})

it('a weekly habit that falls short of its target scores nothing', () => {
  const byHabit = completedPeriodsByHabit([
    row({ frequency: 'weekly', target: 3, date: '2026-10-06', logged: 1 }),
    row({ frequency: 'weekly', target: 3, date: '2026-10-08', logged: 1 }),
  ])
  expect(byHabit.get('h1').periods).toEqual([])
})

it('milestones land on the 7th and 14th day of an unbroken run', () => {
  const periods = Array.from({ length: 15 }, (_, i) => {
    const day = String(i + 1).padStart(2, '0')
    return `2026-10-${day}`
  })
  expect(milestonePeriods(periods)).toEqual(['2026-10-07', '2026-10-14'])
})

it('a broken run restarts the milestone count', () => {
  const periods = [
    '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06',
    // 2026-10-07 missed, so the run never reaches 7
    '2026-10-08', '2026-10-09',
  ]
  expect(milestonePeriods(periods)).toEqual([])
})

it('one completed day scores the base points only', () => {
  const byHabit = new Map([['h1', { frequency: 'daily', periods: ['2026-10-06'] }]])
  const score = scoreWeek({ byHabit, weekStartKey: WEEK, dailyHabitIds: ['h1', 'h2'] })
  expect(score.completions).toBe(1)
  expect(score.allDailyDays, 'h2 was not completed, so no all-habits bonus').toBe(0)
  expect(score.total).toBe(POINTS.COMPLETION)
})

it('completing every daily habit on a day adds the all-habits bonus', () => {
  const byHabit = new Map([
    ['h1', { frequency: 'daily', periods: ['2026-10-06'] }],
    ['h2', { frequency: 'daily', periods: ['2026-10-06'] }],
  ])
  const score = scoreWeek({ byHabit, weekStartKey: WEEK, dailyHabitIds: ['h1', 'h2'] })
  expect(score.allDailyDays).toBe(1)
  expect(score.total).toBe(2 * POINTS.COMPLETION + POINTS.ALL_DAILY)
})

it('only completions inside the week are scored', () => {
  const byHabit = new Map([['h1', { frequency: 'daily', periods: ['2026-09-30', '2026-10-06', '2026-10-20'] }]])
  const score = scoreWeek({ byHabit, weekStartKey: WEEK, dailyHabitIds: ['h1'] })
  expect(score.completions, 'the September and the later-October days belong to other weeks').toBe(1)
})

it('a streak milestone reached during the week is scored, an earlier one is not', () => {
  // An unbroken run from 1 Oct: day 7 falls on 7 Oct (inside the week),
  // day 14 on 14 Oct (the following week).
  const periods = Array.from({ length: 14 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`)
  const byHabit = new Map([['h1', { frequency: 'daily', periods }]])
  const score = scoreWeek({ byHabit, weekStartKey: WEEK, dailyHabitIds: ['h1'] })
  expect(score.milestones).toBe(1)
  expect(score.milestonePoints).toBe(POINTS.STREAK_MILESTONE)
})

it('a user with no daily habits never gets the all-habits bonus', () => {
  const byHabit = new Map([['h1', { frequency: 'weekly', periods: [WEEK] }]])
  const score = scoreWeek({ byHabit, weekStartKey: WEEK, dailyHabitIds: [] })
  expect(score.allDailyDays).toBe(0)
  expect(score.total).toBe(POINTS.COMPLETION)
})

it('an empty week scores zero rather than failing', () => {
  const score = scoreWeek({ byHabit: new Map(), weekStartKey: WEEK, dailyHabitIds: [] })
  expect(score.total).toBe(0)
})
