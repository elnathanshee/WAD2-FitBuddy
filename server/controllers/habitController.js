import mongoose from 'mongoose'
import Habit from '../models/Habit.js'
import CheckIn from '../models/CheckIn.js'
import { calculateStreak } from '../utils/streak.js'
import { toDateKey, addDays, weekStart } from '../utils/dates.js'

// ─────────────────────────────────────────────────────────────────────────────
// Rules that apply to every handler:
//  - Only ever touch documents where userId === req.userId (a user must never
//    read/edit/delete someone else's habit). If the habit isn't found for this
//    user, respond 404 — don't reveal that it exists for someone else.
//  - An :id that isn't a valid ObjectId gives 404, not a 500.
//  - Mongoose ValidationError → 400, anything unexpected → 500. Both are
//    handled by the error handler in app.js: in Express 5, a rejected promise
//    from an async handler is passed to it automatically.
// ─────────────────────────────────────────────────────────────────────────────

// Fields a client is allowed to set. userId, _id and timestamps are never
// taken from the request body.
const EDITABLE_FIELDS = ['name', 'category', 'frequency', 'icon']

// Copies only the editable fields that are present in the body onto the habit.
// target is merged field by field, so { target: { amount: 5 } } keeps the unit.
function applyEditableFields(habit, body) {
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) habit.set(field, body[field])
  }
  if (body.target && typeof body.target === 'object') {
    if (body.target.amount !== undefined) habit.set('target.amount', body.target.amount)
    if (body.target.unit !== undefined) habit.set('target.unit', body.target.unit)
  }
}

// Returns this user's habit with the given id, or null (also for invalid ids).
async function findOwnedHabit(req) {
  if (!mongoose.isValidObjectId(req.params.id)) return null
  return Habit.findOne({ _id: req.params.id, userId: req.userId })
}

function habitNotFound(res) {
  res.status(404).json({ message: 'Habit not found' })
}

// Amounts are rounded to 2 decimal places, so 0.1 + 0.2 is stored as 0.3.
const MAX_AMOUNT = 100000
function roundAmount(value) {
  return Math.round(value * 100) / 100
}

// True for a real calendar day in 'YYYY-MM-DD' form (rejects '2026-02-30').
function isValidDateKey(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && addDays(value, 0) === value
}

// Progress and streak for one habit, from its check-ins (any order).
// A daily habit is measured per day; a weekly habit per Monday–Sunday week,
// adding up every day logged in that week.
//   todayCount  — amount logged today (what "Edit today's total" changes)
//   periodCount — today's total (daily) or this week's total (weekly);
//                 the habit is done when periodCount >= target.amount
//   weekTotals  — weekly habits only: Map of week Monday → that week's total
function summarise(habit, checkIns, today) {
  const todayCount = checkIns.find((checkIn) => checkIn.date === today)?.count ?? 0

  if (habit.frequency !== 'weekly') {
    const completedDays = checkIns
      .filter((checkIn) => checkIn.count >= habit.target.amount)
      .map((checkIn) => checkIn.date)
    return { todayCount, periodCount: todayCount, streak: calculateStreak(completedDays, today) }
  }

  const weekTotals = new Map()
  for (const checkIn of checkIns) {
    const week = weekStart(checkIn.date)
    weekTotals.set(week, roundAmount((weekTotals.get(week) ?? 0) + checkIn.count))
  }
  const thisWeek = weekStart(today)
  const completedWeeks = [...weekTotals].filter(([, total]) => total >= habit.target.amount).map(([week]) => week)
  return {
    todayCount,
    periodCount: weekTotals.get(thisWeek) ?? 0,
    streak: calculateStreak(completedWeeks, thisWeek, 7),
    weekTotals,
  }
}

// GET /api/habits?today=YYYY-MM-DD
// → 200 [habits] for this user, newest first. Each habit also has
//   todayCount, periodCount and streak: { current, longest } (see summarise),
//   so the list page needs no extra request per habit.
// → 400 if today is not a valid date
// Two queries in total (habits + their check-ins), however many habits there are.
export async function listHabits(req, res) {
  const { today = toDateKey() } = req.query
  if (!isValidDateKey(today)) {
    return res.status(400).json({ message: 'today must be a real day in YYYY-MM-DD format' })
  }

  const habits = await Habit.find({ userId: req.userId }).sort({ createdAt: -1 }).lean()
  const checkIns = await CheckIn.find({
    userId: req.userId,
    habitId: { $in: habits.map((habit) => habit._id) },
  }).lean()

  // Group check-ins by habit so each habit only looks at its own.
  const checkInsByHabit = new Map()
  for (const checkIn of checkIns) {
    const key = checkIn.habitId.toString()
    if (!checkInsByHabit.has(key)) checkInsByHabit.set(key, [])
    checkInsByHabit.get(key).push(checkIn)
  }

  const result = habits.map((habit) => {
    const { todayCount, periodCount, streak } = summarise(habit, checkInsByHabit.get(habit._id.toString()) ?? [], today)
    return { ...habit, todayCount, periodCount, streak }
  })
  res.json(result)
}

// POST /api/habits
// body: { name, category, frequency, timesPerWeek, target: { amount, unit }, icon, colour }
// → 201 created habit
// → 400 if validation fails (e.g. empty name)
export async function createHabit(req, res) {
  const habit = new Habit({ userId: req.userId })
  applyEditableFields(habit, req.body ?? {})
  await habit.save()
  res.status(201).json(habit)
}

// GET /api/habits/:id
// → 200 habit, or 404
export async function getHabit(req, res) {
  const habit = await findOwnedHabit(req)
  if (!habit) return habitNotFound(res)
  res.json(habit)
}

// PUT /api/habits/:id
// body: any editable field from createHabit
// → 200 updated habit, 400 on validation error, 404 if not found
// Uses find + save rather than findOneAndUpdate, because save() always runs
// the schema validators (findOneAndUpdate only does with runValidators: true).
export async function updateHabit(req, res) {
  const habit = await findOwnedHabit(req)
  if (!habit) return habitNotFound(res)
  applyEditableFields(habit, req.body ?? {})
  await habit.save()
  res.json(habit)
}

// DELETE /api/habits/:id
// → 204 (no body), or 404
// Also deletes this habit's check-ins so no orphaned history is left behind.
export async function deleteHabit(req, res) {
  const habit = await findOwnedHabit(req)
  if (!habit) return habitNotFound(res)
  await CheckIn.deleteMany({ habitId: habit._id, userId: req.userId })
  await habit.deleteOne()
  res.status(204).end()
}

// Shared date checks for logging and setting a day's total.
// Returns an error message, or '' if the date is fine.
function dateError(date) {
  if (!isValidDateKey(date)) return 'date must be a real day in YYYY-MM-DD format'
  // The frontend sends the user's LOCAL date, which can be up to a day ahead of
  // the server's date in another timezone, so allow one day of slack.
  if (date > addDays(toDateKey(), 1)) return 'Cannot log progress for a future date'
  return ''
}

// POST /api/habits/:id/checkins
// body: { date: 'YYYY-MM-DD', count?: number }   (count defaults to 1)
// `count` is ADDED to that day's total, e.g. logging 2.5 km then 1 km gives
// 3.5 km. Logging again on the same day updates the existing document rather
// than creating a second one.
// → 201 when the day's check-in is created, 200 when an existing one is updated
// → 400 if date or count is invalid, or the date is in the future
// → 404 if habit not found
export async function checkIn(req, res) {
  const habit = await findOwnedHabit(req)
  if (!habit) return habitNotFound(res)

  const { date, count = 1 } = req.body ?? {}
  const badDate = dateError(date)
  if (badDate) return res.status(400).json({ message: badDate })
  if (typeof count !== 'number' || !(roundAmount(count) > 0) || count > MAX_AMOUNT) {
    return res.status(400).json({ message: `Amount must be a number more than 0 and at most ${MAX_AMOUNT}` })
  }

  // An update "pipeline" lets the database add and round in one atomic step:
  // new count = round(old count (or 0 if new) + amount, 2 decimals).
  const result = await CheckIn.findOneAndUpdate(
    { habitId: habit._id, userId: req.userId, date },
    [{ $set: { count: { $round: [{ $add: [{ $ifNull: ['$count', 0] }, roundAmount(count)] }, 2] } } }],
    { new: true, upsert: true, includeResultMetadata: true }
  )
  const created = !result.lastErrorObject?.updatedExisting
  res.status(created ? 201 : 200).json(result.value)
}

// PUT /api/habits/:id/checkins/:date
// body: { count: number }
// Sets that day's total directly — used to fix a mistake ("Edit today's total").
// count 0 removes the day's check-in.
// → 200 the updated check-in, or 204 when count is 0
// → 400 if date or count is invalid, 404 if habit not found
export async function setCheckIn(req, res) {
  const habit = await findOwnedHabit(req)
  if (!habit) return habitNotFound(res)

  const { date } = req.params
  const { count } = req.body ?? {}
  const badDate = dateError(date)
  if (badDate) return res.status(400).json({ message: badDate })
  if (typeof count !== 'number' || !(count >= 0) || count > MAX_AMOUNT) {
    return res.status(400).json({ message: `Total must be a number from 0 to ${MAX_AMOUNT}` })
  }

  const total = roundAmount(count)
  if (total === 0) {
    await CheckIn.deleteOne({ habitId: habit._id, userId: req.userId, date })
    return res.status(204).end()
  }
  const checkIn = await CheckIn.findOneAndUpdate(
    { habitId: habit._id, userId: req.userId, date },
    { $set: { count: total } },
    { new: true, upsert: true, runValidators: true }
  )
  res.json(checkIn)
}

// DELETE /api/habits/:id/checkins/:date
// Undo a check-in (e.g. tapped by mistake). Removes that whole day's check-in.
// → 204, or 404 if there was no check-in that day
export async function undoCheckIn(req, res) {
  const habit = await findOwnedHabit(req)
  if (!habit) return habitNotFound(res)

  const { deletedCount } = await CheckIn.deleteOne({
    habitId: habit._id,
    userId: req.userId,
    date: req.params.date,
  })
  if (deletedCount === 0) {
    return res.status(404).json({ message: 'No check-in found for that day' })
  }
  res.status(204).end()
}

// GET /api/habits/:id/history?from=YYYY-MM-DD&to=YYYY-MM-DD&today=YYYY-MM-DD
// → 200 {
//     habit,
//     checkIns: [{ date, count, completed }],   // only days that have a check-in, oldest first
//     weeks: [{ start, total, completed }],      // weekly habits only: each week overlapping the range
//     streak: { current, longest }
//   }
// completed: daily → that day reached the target; weekly → that day's WEEK did.
// Default range: the last 30 days up to `today`.
// Streaks are calculated from ALL history, not just the range.
export async function getHistory(req, res) {
  const habit = await findOwnedHabit(req)
  if (!habit) return habitNotFound(res)

  const { today = toDateKey() } = req.query
  const { to = today, from = addDays(to, -29) } = req.query
  for (const value of [today, from, to]) {
    if (!isValidDateKey(value)) {
      return res.status(400).json({ message: 'from, to and today must be real days in YYYY-MM-DD format' })
    }
  }

  const allCheckIns = await CheckIn.find({ habitId: habit._id, userId: req.userId })
    .sort({ date: 1 })
    .lean()
  const { streak, weekTotals } = summarise(habit, allCheckIns, today)
  const reached = (total) => total >= habit.target.amount

  const isCompleted = weekTotals
    ? (checkIn) => reached(weekTotals.get(weekStart(checkIn.date)))
    : (checkIn) => reached(checkIn.count)

  const checkIns = allCheckIns
    .filter((checkIn) => checkIn.date >= from && checkIn.date <= to)
    .map((checkIn) => ({ date: checkIn.date, count: checkIn.count, completed: isCompleted(checkIn) }))

  const body = { habit, checkIns, streak }
  if (weekTotals) {
    body.weeks = []
    for (let start = weekStart(from); start <= to; start = addDays(start, 7)) {
      const total = weekTotals.get(start) ?? 0
      body.weeks.push({ start, total, completed: reached(total) })
    }
  }
  res.json(body)
}
