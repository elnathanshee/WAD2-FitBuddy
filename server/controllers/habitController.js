// Imported for you — not used until the handlers are implemented.
import Habit from '../models/Habit.js'
import CheckIn from '../models/CheckIn.js'
import { calculateStreak } from '../utils/streak.js'

// ─────────────────────────────────────────────────────────────────────────────
// Each handler below is a STUB: the comment above it is the spec, and the
// e2e tests in FitBuddy/e2e/habits.spec.js check the behaviour through the UI.
// Replace the `notImplemented` line with your implementation.
//
// Rules that apply to every handler:
//  - Only ever touch documents where userId === req.userId (a user must never
//    read/edit/delete someone else's habit). If the habit isn't found for this
//    user, respond 404 — don't reveal that it exists for someone else.
//  - An :id that isn't a valid ObjectId should give 404, not crash with 500.
//    (Hint: mongoose.isValidObjectId)
//  - Mongoose ValidationError → 400 with a readable message.
//  - Anything unexpected → 500. In Express 5, a rejected promise from an async
//    handler is passed to the error handler automatically.
// ─────────────────────────────────────────────────────────────────────────────

function notImplemented(res, what) {
  res.status(501).json({ message: `Not implemented yet: ${what}` })
}

// GET /api/habits
// → 200 [habits] for this user, newest first.
// Stretch: include today's check-in count and current streak on each habit so
// the list page can show them without one extra request per habit.
export async function listHabits(req, res) {
  notImplemented(res, 'listHabits')
}

// POST /api/habits
// body: { name, category, frequency, timesPerWeek, target: { amount, unit }, icon, colour }
// → 201 created habit
// → 400 if validation fails (e.g. empty name)
// Never trust a userId from the body — use req.userId.
export async function createHabit(req, res) {
  notImplemented(res, 'createHabit')
}

// GET /api/habits/:id
// → 200 habit, or 404
export async function getHabit(req, res) {
  notImplemented(res, 'getHabit')
}

// PUT /api/habits/:id
// body: any editable field from createHabit
// → 200 updated habit, 400 on validation error, 404 if not found
// Think about: does findOneAndUpdate run schema validators by default?
// Think about: which fields must NOT be editable (userId, _id)?
export async function updateHabit(req, res) {
  notImplemented(res, 'updateHabit')
}

// DELETE /api/habits/:id
// → 204 (no body), or 404
// Also delete this habit's check-ins so no orphaned history is left behind.
export async function deleteHabit(req, res) {
  notImplemented(res, 'deleteHabit')
}

// POST /api/habits/:id/checkins
// body: { date: 'YYYY-MM-DD', count?: number }   (count defaults to 1)
// The frontend sends the user's LOCAL date, not the server's.
// → 200/201 the check-in for that day, 400 if date is invalid or in the future,
//   404 if habit not found.
// Checking in twice on the same day should UPDATE that day's count, not create
// a second document (the unique index on {habitId, date} will reject duplicates).
export async function checkIn(req, res) {
  notImplemented(res, 'checkIn')
}

// DELETE /api/habits/:id/checkins/:date
// Undo a check-in (e.g. tapped by mistake).
// → 204, or 404 if there was no check-in that day
export async function undoCheckIn(req, res) {
  notImplemented(res, 'undoCheckIn')
}

// GET /api/habits/:id/history?from=YYYY-MM-DD&to=YYYY-MM-DD&today=YYYY-MM-DD
// → 200 {
//     habit,
//     checkIns: [{ date, count, completed }],   // completed = count >= target.amount
//     streak: { current, longest }              // from utils/streak.js
//   }
// Default range: the last 30 days up to `today`.
// Streaks should be calculated from ALL completed days, not just the range.
export async function getHistory(req, res) {
  notImplemented(res, 'getHistory')
}
