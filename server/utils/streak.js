import { addDays } from './dates.js'

/**
 * Calculates streaks: runs of consecutive completed periods.
 *
 * Daily habit:  calculateStreak(completedDays, today)
 * Weekly habit: calculateStreak(completedWeekStarts, thisWeekStart, 7)
 *               — each week is identified by its Monday, so consecutive weeks
 *               are 7 days apart.
 *
 * @param {string[]} completedDates  'YYYY-MM-DD' strings of completed periods.
 *                                   May be unsorted and may contain duplicates.
 * @param {string}   today           'YYYY-MM-DD' — the current period (the user's
 *                                   local today, or this week's Monday).
 * @param {number}   [step=1]        Days between consecutive periods (7 for weeks).
 * @returns {{ current: number, longest: number }}
 *
 * current — number of consecutive completed periods ending with the current one.
 *           Grace rule: if the current period isn't completed YET, count the
 *           run ending with the previous one instead (so the streak doesn't
 *           show 0 every morning, or every Monday).
 *           If neither is completed, current is 0.
 * longest — the longest run of consecutive completed periods anywhere in history.
 *
 * Dates after `today` are ignored.
 */
export function calculateStreak(completedDates, today, step = 1) {
  // 'YYYY-MM-DD' strings sort and compare correctly as plain strings.
  const done = new Set(completedDates.filter((date) => date <= today))

  // Walk backwards from the current period (or the previous one, under the grace rule).
  let current = 0
  let period = done.has(today) ? today : addDays(today, -step)
  while (done.has(period)) {
    current++
    period = addDays(period, -step)
  }

  // Each run starts on a period whose previous period isn't done; measure it forwards.
  let longest = 0
  for (const start of done) {
    if (done.has(addDays(start, -step))) continue
    let length = 1
    while (done.has(addDays(start, length * step))) length++
    longest = Math.max(longest, length)
  }

  return { current, longest }
}
