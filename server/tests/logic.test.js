// Tests for the gamification rules. These deliberately cover only the pure
// functions, so they run with no database connection and no network.
const test = require('node:test')
const assert = require('node:assert/strict')
const { computeStreak } = require('../services/streakService')
const { decideAwards, POINTS } = require('../services/pointsService')
const { mondayOf, addDays, diffInDays } = require('../services/dateUtils')

test('mondayOf returns the Monday of that ISO week', () => {
  assert.equal(mondayOf('2026-10-10'), '2026-10-05') // Saturday -> Monday
  assert.equal(mondayOf('2026-10-05'), '2026-10-05') // Monday -> itself
  assert.equal(mondayOf('2026-10-11'), '2026-10-05') // Sunday -> same week's Monday
  assert.equal(mondayOf('2026-10-12'), '2026-10-12') // next Monday -> new week
})

test('mondayOf rolls over correctly across a month boundary', () => {
  assert.equal(mondayOf('2026-11-01'), '2026-10-26') // Sunday 1 Nov
})

test('streak is zero with no check-ins', () => {
  assert.deepEqual(computeStreak([], '2026-10-10'), { currentStreak: 0, longestStreak: 0 })
})

test('consecutive days ending today count as a live streak', () => {
  const dates = ['2026-10-08', '2026-10-09', '2026-10-10']
  assert.deepEqual(computeStreak(dates, '2026-10-10'), { currentStreak: 3, longestStreak: 3 })
})

test('a streak ending yesterday is still live (the day is not over yet)', () => {
  const dates = ['2026-10-08', '2026-10-09']
  assert.deepEqual(computeStreak(dates, '2026-10-10'), { currentStreak: 2, longestStreak: 2 })
})

test('a missed day breaks the current streak but longest is remembered', () => {
  const dates = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-07']
  const result = computeStreak(dates, '2026-10-10')
  assert.equal(result.currentStreak, 0, 'last check-in was 3 days ago, so the streak is broken')
  assert.equal(result.longestStreak, 4)
})

test('longest streak is found even when it is not the most recent run', () => {
  const dates = [
    '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05',
    '2026-10-09', '2026-10-10',
  ]
  const result = computeStreak(dates, '2026-10-10')
  assert.equal(result.currentStreak, 2)
  assert.equal(result.longestStreak, 5)
})

test('a plain check-in earns the base points only', () => {
  const awards = decideAwards({ activeHabitCount: 3, habitsCompletedToday: 1, currentStreak: 2 })
  assert.deepEqual(awards, [{ reason: 'CHECKIN', points: POINTS.CHECKIN }])
})

test('completing every active habit adds the all-daily bonus', () => {
  const awards = decideAwards({ activeHabitCount: 3, habitsCompletedToday: 3, currentStreak: 2 })
  assert.equal(awards.length, 2)
  assert.equal(awards[1].reason, 'ALL_DAILY_BONUS')
  assert.equal(awards.reduce((s, a) => s + a.points, 0), 30)
})

test('hitting a 7-day streak milestone adds the streak bonus', () => {
  const awards = decideAwards({ activeHabitCount: 3, habitsCompletedToday: 1, currentStreak: 7 })
  assert.equal(awards.length, 2)
  assert.equal(awards[1].reason, 'STREAK_BONUS')
})

test('day 14 is also a milestone, day 8 is not', () => {
  assert.equal(decideAwards({ activeHabitCount: 1, habitsCompletedToday: 0, currentStreak: 14 }).length, 2)
  assert.equal(decideAwards({ activeHabitCount: 1, habitsCompletedToday: 0, currentStreak: 8 }).length, 1)
})

test('both bonuses can stack on the same check-in', () => {
  const awards = decideAwards({ activeHabitCount: 2, habitsCompletedToday: 2, currentStreak: 7 })
  assert.equal(awards.length, 3)
  assert.equal(awards.reduce((s, a) => s + a.points, 0), 60)
})

test('a user with no active habits never earns the all-daily bonus', () => {
  const awards = decideAwards({ activeHabitCount: 0, habitsCompletedToday: 0, currentStreak: 1 })
  assert.equal(awards.length, 1)
})

test('date helpers round-trip correctly', () => {
  assert.equal(addDays('2026-10-10', -1), '2026-10-09')
  assert.equal(addDays('2026-10-31', 1), '2026-11-01')
  assert.equal(diffInDays('2026-10-10', '2026-10-03'), 7)
})
