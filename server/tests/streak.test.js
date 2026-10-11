// Unit tests for utils/streak.js — run with `npm test` from the server folder.
// Every test fixes `today` explicitly, so results never depend on the real date.
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { calculateStreak } from '../utils/streak.js'
import { weekStart } from '../utils/dates.js'

const TODAY = '2026-10-15'

describe('calculateStreak — current streak', () => {
  test('no check-ins → 0', () => {
    assert.deepEqual(calculateStreak([], TODAY), { current: 0, longest: 0 })
  })

  test('only today → 1', () => {
    assert.equal(calculateStreak(['2026-10-15'], TODAY).current, 1)
  })

  test('today and the two days before → 3', () => {
    const dates = ['2026-10-13', '2026-10-14', '2026-10-15']
    assert.equal(calculateStreak(dates, TODAY).current, 3)
  })

  test('grace rule: today not done yet, but yesterday was → streak continues from yesterday', () => {
    const dates = ['2026-10-12', '2026-10-13', '2026-10-14']
    assert.equal(calculateStreak(dates, TODAY).current, 3)
  })

  test('missed yesterday AND today → 0', () => {
    const dates = ['2026-10-11', '2026-10-12', '2026-10-13']
    assert.equal(calculateStreak(dates, TODAY).current, 0)
  })

  test('a gap breaks the streak', () => {
    // 10-14 missing, so only today counts
    const dates = ['2026-10-12', '2026-10-13', '2026-10-15']
    assert.equal(calculateStreak(dates, TODAY).current, 1)
  })

  test('crosses a month boundary (non-leap February)', () => {
    const dates = ['2026-02-27', '2026-02-28', '2026-03-01']
    assert.equal(calculateStreak(dates, '2026-03-01').current, 3)
  })

  test('crosses a year boundary', () => {
    const dates = ['2026-12-30', '2026-12-31', '2027-01-01']
    assert.equal(calculateStreak(dates, '2027-01-01').current, 3)
  })
})

describe('calculateStreak — longest streak', () => {
  test('longest can be an old run, longer than the current one', () => {
    const dates = [
      '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', // run of 5
      '2026-10-14', '2026-10-15', // current run of 2
    ]
    assert.deepEqual(calculateStreak(dates, TODAY), { current: 2, longest: 5 })
  })

  test('longest equals current when the current run is the best', () => {
    const dates = ['2026-10-01', '2026-10-13', '2026-10-14', '2026-10-15']
    assert.deepEqual(calculateStreak(dates, TODAY), { current: 3, longest: 3 })
  })
})

describe('calculateStreak — messy input', () => {
  test('unsorted input gives the same answer as sorted input', () => {
    const dates = ['2026-10-15', '2026-10-13', '2026-10-14']
    assert.deepEqual(calculateStreak(dates, TODAY), { current: 3, longest: 3 })
  })

  test('duplicate dates are only counted once', () => {
    const dates = ['2026-10-14', '2026-10-14', '2026-10-15', '2026-10-15']
    assert.deepEqual(calculateStreak(dates, TODAY), { current: 2, longest: 2 })
  })

  test('dates after today are ignored', () => {
    const dates = ['2026-10-15', '2026-10-16', '2026-10-17']
    assert.deepEqual(calculateStreak(dates, TODAY), { current: 1, longest: 1 })
  })
})

describe('calculateStreak — weekly habits (step of 7 days)', () => {
  // Weeks are identified by their Monday. 2026-10-12 is a Monday.
  const THIS_WEEK = '2026-10-12'

  test('three completed weeks in a row, including this one → 3', () => {
    const weeks = ['2026-09-28', '2026-10-05', '2026-10-12']
    assert.equal(calculateStreak(weeks, THIS_WEEK, 7).current, 3)
  })

  test('grace rule: this week not done yet, but last week was → streak continues', () => {
    const weeks = ['2026-09-28', '2026-10-05']
    assert.equal(calculateStreak(weeks, THIS_WEEK, 7).current, 2)
  })

  test('a missed week breaks the streak; longest is kept', () => {
    const weeks = ['2026-08-31', '2026-09-07', '2026-09-14', '2026-10-05']
    assert.deepEqual(calculateStreak(weeks, THIS_WEEK, 7), { current: 1, longest: 3 })
  })
})

describe('weekStart', () => {
  test('returns the Monday of the week (weeks run Monday–Sunday)', () => {
    assert.equal(weekStart('2026-10-12'), '2026-10-12') // Monday → itself
    assert.equal(weekStart('2026-10-15'), '2026-10-12') // Thursday
    assert.equal(weekStart('2026-10-18'), '2026-10-12') // Sunday → previous Monday
    assert.equal(weekStart('2026-03-01'), '2026-02-23') // across a month boundary
  })
})
