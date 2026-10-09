/**
 * STUB — implement this so `npm test` passes (see tests/streak.test.js).
 *
 * Calculates streaks for a DAILY habit.
 *
 * @param {string[]} completedDates  'YYYY-MM-DD' strings of days the habit was
 *                                   completed. May be unsorted and may contain
 *                                   duplicates.
 * @param {string}   today           'YYYY-MM-DD' — the user's local "today".
 * @returns {{ current: number, longest: number }}
 *
 * current — number of consecutive completed days ending today.
 *           Grace rule: if today isn't completed YET, count the run ending
 *           yesterday instead (so the streak doesn't show 0 every morning).
 *           If neither today nor yesterday is completed, current is 0.
 * longest — the longest run of consecutive completed days anywhere in history.
 *
 * Dates after `today` should be ignored.
 *
 * Hint: utils/dates.js has addDays() for stepping between date keys, which
 * handles month/year boundaries for you. A Set gives fast "was this day done?"
 * lookups.
 */
export function calculateStreak(completedDates, today) {
  throw new Error('calculateStreak is not implemented yet')
}
