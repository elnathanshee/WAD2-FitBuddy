// Unit tests for services/achievementsService.js — run with `npm test` from the
// server folder. No database: buildStats and evaluateBadges are pure functions.
import { describe, it, expect } from 'vitest'
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
  it('no history → everything zero', () => {
    const stats = buildStats({ byHabit: byHabit([]), dailyHabitIds: [], today: '2026-10-10' })
    expect(stats).toEqual({
      completions: 0,
      perfectDays: 0,
      milestones: 0,
      longestStreak: 0,
      totalPoints: 0,
      friends: 0,
    })
  })

  it('counts one completion per completed day', () => {
    const stats = buildStats({
      byHabit: byHabit([['h1', { frequency: 'daily', periods: daysFrom('2026-10-01', 3) }]]),
      dailyHabitIds: ['h1'],
      today: '2026-10-03',
    })
    expect(stats.completions).toBe(3)
  })

  it('longest streak is the longest run, not the current one', () => {
    const periods = [...daysFrom('2026-10-01', 5), ...daysFrom('2026-10-10', 2)]
    const stats = buildStats({
      byHabit: byHabit([['h1', { frequency: 'daily', periods }]]),
      dailyHabitIds: ['h1'],
      today: '2026-10-11',
    })
    expect(stats.longestStreak).toBe(5)
  })

  it('a perfect day needs every daily habit, not just one', () => {
    const stats = buildStats({
      byHabit: byHabit([
        ['h1', { frequency: 'daily', periods: ['2026-10-01', '2026-10-02'] }],
        ['h2', { frequency: 'daily', periods: ['2026-10-02'] }],
      ]),
      dailyHabitIds: ['h1', 'h2'],
      today: '2026-10-02',
    })
    // Only 2 Oct has both habits done
    expect(stats.perfectDays).toBe(1)
  })

  it('weekly habits do not count towards perfect days', () => {
    const stats = buildStats({
      byHabit: byHabit([
        ['h1', { frequency: 'daily', periods: ['2026-10-05'] }],
        ['h2', { frequency: 'weekly', periods: ['2026-10-05'] }],
      ]),
      dailyHabitIds: ['h1'],
      today: '2026-10-05',
    })
    expect(stats.perfectDays).toBe(1)
    expect(stats.completions).toBe(2)
  })

  it('a 7 day run earns one streak milestone', () => {
    const stats = buildStats({
      byHabit: byHabit([['h1', { frequency: 'daily', periods: daysFrom('2026-10-01', 7) }]]),
      dailyHabitIds: ['h1'],
      today: '2026-10-07',
    })
    expect(stats.milestones).toBe(1)
    // 7 completions x10, 7 perfect days x20, 1 milestone x30
    expect(stats.totalPoints).toBe(7 * 10 + 7 * 20 + 30)
  })

  it('friend count is passed straight through', () => {
    const stats = buildStats({ byHabit: byHabit([]), dailyHabitIds: [], today: '2026-10-10', friendCount: 4 })
    expect(stats.friends).toBe(4)
  })
})

describe('evaluateBadges', () => {
  const zeroStats = { completions: 0, perfectDays: 0, milestones: 0, longestStreak: 0, totalPoints: 0, friends: 0 }

  it('returns every badge in the catalogue', () => {
    expect(evaluateBadges(zeroStats)).toHaveLength(BADGES.length)
  })

  it('nothing is earned with no history', () => {
    expect(evaluateBadges(zeroStats).filter((b) => b.earned)).toHaveLength(0)
  })

  it('reaching the target earns the badge', () => {
    const badges = evaluateBadges({ ...zeroStats, completions: 10 })
    const byId = new Map(badges.map((b) => [b.id, b]))
    expect(byId.get('first-step').earned).toBe(true)
    expect(byId.get('getting-going').earned).toBe(true)
    expect(byId.get('half-century').earned).toBe(false)
  })

  it('percent shows progress and never goes over 100', () => {
    const byId = new Map(evaluateBadges({ ...zeroStats, completions: 25 }).map((b) => [b.id, b]))
    expect(byId.get('half-century').percent).toBe(50) // 25 of 50
    expect(byId.get('first-step').percent).toBe(100) // 25 of 1, capped
  })

  it('every badge points at a stat that exists', () => {
    for (const badge of BADGES) {
      expect(badge.stat in zeroStats, `${badge.id} uses unknown stat ${badge.stat}`).toBeTruthy()
      expect(badge.target > 0, `${badge.id} needs a positive target`).toBeTruthy()
    }
  })
})
