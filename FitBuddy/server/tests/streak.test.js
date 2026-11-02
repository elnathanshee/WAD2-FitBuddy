// Unit tests for utils/streak.js — run with `npm test` from the server folder.
// Every test fixes `today` explicitly, so results never depend on the real date.
import { describe, it, expect } from 'vitest'
import { calculateStreak } from '../utils/streak.js'
import { weekStart } from '../utils/dates.js'

const TODAY = '2026-10-15'

describe('calculateStreak — current streak', () => {
  it('no check-ins → 0', () => {
    expect(calculateStreak([], TODAY)).toEqual({ current: 0, longest: 0 })
  })

  it('only today → 1', () => {
    expect(calculateStreak(['2026-10-15'], TODAY).current).toBe(1)
  })

  it('today and the two days before → 3', () => {
    const dates = ['2026-10-13', '2026-10-14', '2026-10-15']
    expect(calculateStreak(dates, TODAY).current).toBe(3)
  })

  it('grace rule: today not done yet, but yesterday was → streak continues from yesterday', () => {
    const dates = ['2026-10-12', '2026-10-13', '2026-10-14']
    expect(calculateStreak(dates, TODAY).current).toBe(3)
  })

  it('missed yesterday AND today → 0', () => {
    const dates = ['2026-10-11', '2026-10-12', '2026-10-13']
    expect(calculateStreak(dates, TODAY).current).toBe(0)
  })

  it('a gap breaks the streak', () => {
    // 10-14 missing, so only today counts
    const dates = ['2026-10-12', '2026-10-13', '2026-10-15']
    expect(calculateStreak(dates, TODAY).current).toBe(1)
  })

  it('crosses a month boundary (non-leap February)', () => {
    const dates = ['2026-02-27', '2026-02-28', '2026-03-01']
    expect(calculateStreak(dates, '2026-03-01').current).toBe(3)
  })

  it('crosses a year boundary', () => {
    const dates = ['2026-12-30', '2026-12-31', '2027-01-01']
    expect(calculateStreak(dates, '2027-01-01').current).toBe(3)
  })
})

describe('calculateStreak — longest streak', () => {
  it('longest can be an old run, longer than the current one', () => {
    const dates = [
      '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', // run of 5
      '2026-10-14', '2026-10-15', // current run of 2
    ]
    expect(calculateStreak(dates, TODAY)).toEqual({ current: 2, longest: 5 })
  })

  it('longest equals current when the current run is the best', () => {
    const dates = ['2026-10-01', '2026-10-13', '2026-10-14', '2026-10-15']
    expect(calculateStreak(dates, TODAY)).toEqual({ current: 3, longest: 3 })
  })
})

describe('calculateStreak — messy input', () => {
  it('unsorted input gives the same answer as sorted input', () => {
    const dates = ['2026-10-15', '2026-10-13', '2026-10-14']
    expect(calculateStreak(dates, TODAY)).toEqual({ current: 3, longest: 3 })
  })

  it('duplicate dates are only counted once', () => {
    const dates = ['2026-10-14', '2026-10-14', '2026-10-15', '2026-10-15']
    expect(calculateStreak(dates, TODAY)).toEqual({ current: 2, longest: 2 })
  })

  it('dates after today are ignored', () => {
    const dates = ['2026-10-15', '2026-10-16', '2026-10-17']
    expect(calculateStreak(dates, TODAY)).toEqual({ current: 1, longest: 1 })
  })
})

describe('calculateStreak — weekly habits (step of 7 days)', () => {
  // Weeks are identified by their Monday. 2026-10-12 is a Monday.
  const THIS_WEEK = '2026-10-12'

  it('three completed weeks in a row, including this one → 3', () => {
    const weeks = ['2026-09-28', '2026-10-05', '2026-10-12']
    expect(calculateStreak(weeks, THIS_WEEK, 7).current).toBe(3)
  })

  it('grace rule: this week not done yet, but last week was → streak continues', () => {
    const weeks = ['2026-09-28', '2026-10-05']
    expect(calculateStreak(weeks, THIS_WEEK, 7).current).toBe(2)
  })

  it('a missed week breaks the streak; longest is kept', () => {
    const weeks = ['2026-08-31', '2026-09-07', '2026-09-14', '2026-10-05']
    expect(calculateStreak(weeks, THIS_WEEK, 7)).toEqual({ current: 1, longest: 3 })
  })
})

describe('weekStart', () => {
  it('returns the Monday of the week (weeks run Monday–Sunday)', () => {
    expect(weekStart('2026-10-12')).toBe('2026-10-12') // Monday → itself
    expect(weekStart('2026-10-15')).toBe('2026-10-12') // Thursday
    expect(weekStart('2026-10-18')).toBe('2026-10-12') // Sunday → previous Monday
    expect(weekStart('2026-03-01')).toBe('2026-02-23') // across a month boundary
  })
})
