// Unit tests for services/achievementsService.js — run with `npm test` from the
// server folder. No database: buildStats and evaluateBadges are pure functions.
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { BADGES, buildStats, evaluateBadges } from '../services/achievementsService.js'

// A run of consecutive days starting at 2026-10-01, as 'YYYY-MM-DD' strings
const daysFrom = (start, count) => {
  const [y, m, d] = start.split('-').map(Number)
  const out = []
  for (let i = 0; i < count; i++) {
    const date = new Date(y, m - 1, d + i, 12)
    out.push(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    )
  }
  return out
}

const byHabit = (entries) => new Map(entries)

describe('buildStats', () => {
  test('no history → everything zero', () => {
    const stats = buildStats({ byHabit: byHabit([]), dailyHabitIds: [], today: '2026-10-10' })
    assert.deepEqual(stats, {
      completions: 0,
      perfectDays: 0,
      milestones: 0,
      longestStreak: 0,
      totalPoints: 0,
      friends: 0,
    })
  })

  test('counts one completion per completed day', () => {
    const stats = buildStats({
      byHabit: byHabit([['h1', { frequency: 'daily', periods: daysFrom('2026-10-01', 3) }]]),
      dailyHabitIds: ['h1'],
      today: '2026-10-03',
    })
    assert.equal(stats.completions, 3)
  })

  test('longest streak is the longest run, not the current one', () => {
    const periods = [...daysFrom('2026-10-01', 5), ...daysFrom('2026-10-10', 2)]
    const stats = buildStats({
      byHabit: byHabit([['h1', { frequency: 'daily', periods }]]),
      dailyHabitIds: ['h1'],
      today: '2026-10-11',
    })
    assert.equal(stats.longestStreak, 5)
  })

  test('a perfect day needs every daily habit, not just one', () => {
    const stats = buildStats({
      byHabit: byHabit([
        ['h1', { frequency: 'daily', periods: ['2026-10-01', '2026-10-02'] }],
        ['h2', { frequency: 'daily', periods: ['2026-10-02'] }],
      ]),
      dailyHabitIds: ['h1', 'h2'],
      today: '2026-10-02',
    })
    // Only 2 Oct has both habits done
    assert.equal(stats.perfectDays, 1)
  })

  test('weekly habits do not count towards perfect days', () => {
    const stats = buildStats({
      byHabit: byHabit([
        ['h1', { frequency: 'daily', periods: ['2026-10-05'] }],
        ['h2', { frequency: 'weekly', periods: ['2026-10-05'] }],
      ]),
      dailyHabitIds: ['h1'],
      today: '2026-10-05',
    })
    assert.equal(stats.perfectDays, 1)
    assert.equal(stats.completions, 2)
  })

  test('a 7 day run earns one streak milestone', () => {
    const stats = buildStats({
      byHabit: byHabit([['h1', { frequency: 'daily', periods: daysFrom('2026-10-01', 7) }]]),
      dailyHabitIds: ['h1'],
      today: '2026-10-07',
    })
    assert.equal(stats.milestones, 1)
    // 7 completions x10, 7 perfect days x20, 1 milestone x30
    assert.equal(stats.totalPoints, 7 * 10 + 7 * 20 + 30)
  })

  test('friend count is passed straight through', () => {
    const stats = buildStats({ byHabit: byHabit([]), dailyHabitIds: [], today: '2026-10-10', friendCount: 4 })
    assert.equal(stats.friends, 4)
  })
})

describe('evaluateBadges', () => {
  const zeroStats = { completions: 0, perfectDays: 0, milestones: 0, longestStreak: 0, totalPoints: 0, friends: 0 }

  test('returns every badge in the catalogue', () => {
    assert.equal(evaluateBadges(zeroStats).length, BADGES.length)
  })

  test('nothing is earned with no history', () => {
    assert.equal(evaluateBadges(zeroStats).filter((b) => b.earned).length, 0)
  })

  test('reaching the target earns the badge', () => {
    const badges = evaluateBadges({ ...zeroStats, completions: 10 })
    const byId = new Map(badges.map((b) => [b.id, b]))
    assert.equal(byId.get('first-step').earned, true)
    assert.equal(byId.get('getting-going').earned, true)
    assert.equal(byId.get('half-century').earned, false)
  })

  test('percent shows progress and never goes over 100', () => {
    const byId = new Map(evaluateBadges({ ...zeroStats, completions: 25 }).map((b) => [b.id, b]))
    assert.equal(byId.get('half-century').percent, 50) // 25 of 50
    assert.equal(byId.get('first-step').percent, 100) // 25 of 1, capped
  })

  test('every badge points at a stat that exists', () => {
    for (const badge of BADGES) {
      assert.ok(badge.stat in zeroStats, `${badge.id} uses unknown stat ${badge.stat}`)
      assert.ok(badge.target > 0, `${badge.id} needs a positive target`)
    }
  })
})
