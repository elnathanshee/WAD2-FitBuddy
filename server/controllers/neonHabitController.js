// Handlers for /api/habits (the Habits page): create, read, update and delete habits, log progress
// ("check-ins", one row per habit per day), and the history view with streaks.
// All routes need a logged-in user, and every query is limited to that user's own habits.
// Streak rules live in utils/streak.js.

import { getDb } from '../config/neon.js'
import { calculateStreak } from '../utils/streak.js'
import { toDateKey, addDays, weekStart, isValidDateKey } from '../utils/dates.js'

// Biggest amount a target or a single log may have
const MAX_AMOUNT = 100000

// Valid custom day names for weekly habits (ordered Monday to Sunday)
const VALID_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

let customDaysColumnVerified = false
async function ensureCustomDaysColumn(sql) {
  if (customDaysColumnVerified) return
  try {
    await sql`ALTER TABLE habits ADD COLUMN IF NOT EXISTS custom_days VARCHAR(100)`
    customDaysColumnVerified = true
  } catch {
    // Ignore if table does not exist in unit mock
  }
}

function normaliseCustomDays(input, frequency) {
  if (frequency !== 'weekly' || !input) return null
  const raw = Array.isArray(input)
    ? input.map((d) => String(d).trim())
    : String(input)
        .split(',')
        .map((d) => d.trim())
  const chosen = VALID_DAYS.filter((day) => raw.includes(day))
  return chosen.length > 0 ? chosen.join(',') : null
}

// Rounds to 2 decimal places (amounts are stored as NUMERIC(10, 2))
function roundAmount(value) {
  return Math.round(value * 100) / 100
}

// Error text for a check-in date that is not a real past-or-today day, or null when the date is fine
function dateError(date) {
  if (!isValidDateKey(date)) return 'date must be a real day in YYYY-MM-DD format'
  if (date > toDateKey()) return 'Cannot check in for a future date'
  return null
}

// Database row -> the habit shape the frontend expects
function formatHabitRow(row) {
  return {
    _id: String(row.id),
    id: row.id,
    userId: row.user_id,
    name: row.name,
    category: row.category,
    frequency: row.frequency,
    customDays: row.custom_days
      ? String(row.custom_days)
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean)
      : [],
    target: {
      amount: Number(row.target_amount),
      unit: row.target_unit,
    },
    icon: row.icon,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// Database row -> the check-in shape the frontend expects
function formatCheckInRow(row) {
  return {
    _id: String(row.id),
    userId: row.user_id,
    habitId: String(row.habit_id),
    date: row.date,
    count: Number(row.count),
  }
}

// Works out today's amount, the current period's amount and the streak for one habit.
// A daily habit counts per day; a weekly habit adds up each Monday-Sunday week
// (weekTotals is only returned for weekly habits).
function summarise(habit, checkIns, today) {
  const todayCount = checkIns.find((c) => c.date === today)?.count ?? 0

  if (habit.frequency !== 'weekly') {
    const completedDays = checkIns
      .filter((c) => c.count >= habit.target.amount)
      .map((c) => c.date)
    return { todayCount, periodCount: todayCount, streak: calculateStreak(completedDays, today) }
  }

  const weekTotals = new Map()
  for (const c of checkIns) {
    const week = weekStart(c.date)
    weekTotals.set(week, roundAmount((weekTotals.get(week) ?? 0) + c.count))
  }
  const thisWeek = weekStart(today)
  const completedWeeks = [...weekTotals]
    .filter(([, total]) => total >= habit.target.amount)
    .map(([week]) => week)

  return {
    todayCount,
    periodCount: weekTotals.get(thisWeek) ?? 0,
    streak: calculateStreak(completedWeeks, thisWeek, 7),
    weekTotals,
  }
}

// GET /api/habits?today=YYYY-MM-DD
// Responds 200 with an array of the user's habits (newest first), each with todayCount, periodCount
// and streak { current, longest }. `today` is the browser's local date. Error: 400 bad date.
export async function listHabits(req, res) {
  const sql = getDb()
  await ensureCustomDaysColumn(sql)
  const { today = toDateKey() } = req.query
  if (!isValidDateKey(today)) {
    return res.status(400).json({ message: 'today must be a real day in YYYY-MM-DD format' })
  }

  const habitRows = await sql`
    SELECT * FROM habits 
    WHERE user_id = ${req.userId}
    ORDER BY created_at DESC
  `

  if (habitRows.length === 0) return res.json([])

  const habitIds = habitRows.map((h) => h.id)
  const checkInRows = await sql`
    SELECT * FROM check_ins
    WHERE user_id = ${req.userId} AND habit_id = ANY(${habitIds})
  `

  const checkInsByHabit = new Map()
  for (const c of checkInRows) {
    const hid = c.habit_id
    if (!checkInsByHabit.has(hid)) checkInsByHabit.set(hid, [])
    checkInsByHabit.get(hid).push({ date: c.date, count: Number(c.count) })
  }

  const result = habitRows.map((row) => {
    const habit = formatHabitRow(row)
    const checkIns = checkInsByHabit.get(row.id) ?? []
    const summary = summarise(habit, checkIns, today)
    return {
      ...habit,
      todayCount: summary.todayCount,
      periodCount: summary.periodCount,
      streak: summary.streak,
    }
  })

  res.json(result)
}

// POST /api/habits
// Body: { name (max 50), category?, frequency?, customDays?, target: { amount, unit }, icon? }
// Responds 201 with the new habit. Error: 400 invalid name or amount.
export async function createHabit(req, res) {
  const sql = getDb()
  await ensureCustomDaysColumn(sql)
  const { name, category = 'other', frequency = 'daily', customDays, target, icon = '✅' } = req.body || {}

  const trimmedName = String(name || '').trim()
  if (!trimmedName) return res.status(400).json({ message: 'Habit name is required' })
  if (trimmedName.length > 50) return res.status(400).json({ message: 'Habit name must be 50 characters or fewer' })

  const amount = Number(target?.amount)
  if (!amount || amount <= 0 || amount > MAX_AMOUNT) {
    return res.status(400).json({ message: `Target amount must be a number between 0.01 and ${MAX_AMOUNT}` })
  }
  const unit = String(target?.unit || 'times').slice(0, 20).trim()
  const customDaysStr = normaliseCustomDays(customDays, frequency)

  const rows = await sql`
    INSERT INTO habits (user_id, name, category, frequency, custom_days, target_amount, target_unit, icon)
    VALUES (${req.userId}, ${trimmedName}, ${category}, ${frequency}, ${customDaysStr}, ${roundAmount(amount)}, ${unit}, ${icon})
    RETURNING *
  `

  res.status(201).json(formatHabitRow(rows[0]))
}

// GET /api/habits/:id
// Responds 200 with one habit. Error: 404 not found (or not yours).
export async function getHabit(req, res) {
  const sql = getDb()
  await ensureCustomDaysColumn(sql)
  const habitId = parseInt(req.params.id, 10)
  if (isNaN(habitId)) return res.status(404).json({ message: 'Habit not found' })

  const rows = await sql`
    SELECT * FROM habits WHERE id = ${habitId} AND user_id = ${req.userId}
  `
  if (rows.length === 0) return res.status(404).json({ message: 'Habit not found' })

  res.json(formatHabitRow(rows[0]))
}

// PUT /api/habits/:id
// Body: any of { name, category, frequency, customDays, target: { amount, unit }, icon }; missing fields keep their value.
// Responds 200 with the updated habit. Errors: 404 not found, 400 empty name.
export async function updateHabit(req, res) {
  const sql = getDb()
  await ensureCustomDaysColumn(sql)
  const habitId = parseInt(req.params.id, 10)
  if (isNaN(habitId)) return res.status(404).json({ message: 'Habit not found' })

  const existing = await sql`
    SELECT * FROM habits WHERE id = ${habitId} AND user_id = ${req.userId}
  `
  if (existing.length === 0) return res.status(404).json({ message: 'Habit not found' })

  const current = existing[0]
  const { name, category, frequency, customDays, target, icon } = req.body || {}

  const newName = name !== undefined ? String(name).trim() : current.name
  if (!newName) return res.status(400).json({ message: 'Habit name is required' })

  const newCategory = category !== undefined ? String(category).trim() : current.category
  const newFrequency = frequency !== undefined ? String(frequency).trim() : current.frequency
  const newIcon = icon !== undefined ? String(icon).trim() : current.icon
  const newCustomDays =
    newFrequency !== 'weekly'
      ? null
      : customDays !== undefined
        ? normaliseCustomDays(customDays, newFrequency)
        : current.custom_days ?? null

  let newAmount = current.target_amount
  let newUnit = current.target_unit
  if (target && typeof target === 'object') {
    if (target.amount !== undefined) newAmount = roundAmount(Number(target.amount))
    if (target.unit !== undefined) newUnit = String(target.unit).trim()
  }

  const updated = await sql`
    UPDATE habits
    SET name = ${newName}, category = ${newCategory}, frequency = ${newFrequency},
        custom_days = ${newCustomDays},
        target_amount = ${newAmount}, target_unit = ${newUnit}, icon = ${newIcon},
        updated_at = NOW()
    WHERE id = ${habitId} AND user_id = ${req.userId}
    RETURNING *
  `

  res.json(formatHabitRow(updated[0]))
}

// DELETE /api/habits/:id
// Deletes the habit and (by cascade) its check-ins. Responds 204. Error: 404 not found.
export async function deleteHabit(req, res) {
  const sql = getDb()
  const habitId = parseInt(req.params.id, 10)
  if (isNaN(habitId)) return res.status(404).json({ message: 'Habit not found' })

  const deleted = await sql`
    DELETE FROM habits WHERE id = ${habitId} AND user_id = ${req.userId} RETURNING id
  `
  if (deleted.length === 0) return res.status(404).json({ message: 'Habit not found' })

  res.status(204).end()
}

// POST /api/habits/:id/checkins
// Body: { date: 'YYYY-MM-DD' (not in the future), count = 1 }. ADDS count to that day's total.
// Responds 201 (new day) or 200 (day already had a log) with the check-in. Errors: 404, 400 bad date or count.
export async function checkIn(req, res) {
  const sql = getDb()
  const habitId = parseInt(req.params.id, 10)
  if (isNaN(habitId)) return res.status(404).json({ message: 'Habit not found' })

  const habit = await sql`
    SELECT id FROM habits WHERE id = ${habitId} AND user_id = ${req.userId}
  `
  if (habit.length === 0) return res.status(404).json({ message: 'Habit not found' })

  const { date, count = 1 } = req.body || {}
  const badDate = dateError(date)
  if (badDate) return res.status(400).json({ message: badDate })

  if (typeof count !== 'number' || !(roundAmount(count) > 0) || count > MAX_AMOUNT) {
    return res.status(400).json({ message: `Amount must be a number more than 0 and at most ${MAX_AMOUNT}` })
  }

  const delta = roundAmount(count)

  const rows = await sql`
    INSERT INTO check_ins (user_id, habit_id, date, count)
    VALUES (${req.userId}, ${habitId}, ${date}, ${delta})
    ON CONFLICT (habit_id, date) 
    DO UPDATE SET 
      count = ROUND(check_ins.count + EXCLUDED.count, 2),
      updated_at = NOW()
    RETURNING id, user_id, habit_id, date, count, (xmax = 0) AS is_new
  `

  const isCreated = rows[0].is_new
  res.status(isCreated ? 201 : 200).json(formatCheckInRow(rows[0]))
}

// PUT /api/habits/:id/checkins/:date
// Body: { count }. SETS that day's total (0 deletes the check-in). Used by Undo and Edit.
// Responds 200 with the check-in, or 204 when the total is 0. Errors: 404, 400 bad date or count.
export async function setCheckIn(req, res) {
  const sql = getDb()
  const habitId = parseInt(req.params.id, 10)
  if (isNaN(habitId)) return res.status(404).json({ message: 'Habit not found' })

  const habit = await sql`
    SELECT id FROM habits WHERE id = ${habitId} AND user_id = ${req.userId}
  `
  if (habit.length === 0) return res.status(404).json({ message: 'Habit not found' })

  const { date } = req.params
  const { count } = req.body || {}
  const badDate = dateError(date)
  if (badDate) return res.status(400).json({ message: badDate })

  if (typeof count !== 'number' || !(count >= 0) || count > MAX_AMOUNT) {
    return res.status(400).json({ message: `Total must be a number from 0 to ${MAX_AMOUNT}` })
  }

  const total = roundAmount(count)
  if (total === 0) {
    await sql`
      DELETE FROM check_ins 
      WHERE habit_id = ${habitId} AND user_id = ${req.userId} AND date = ${date}
    `
    return res.status(204).end()
  }

  const rows = await sql`
    INSERT INTO check_ins (user_id, habit_id, date, count)
    VALUES (${req.userId}, ${habitId}, ${date}, ${total})
    ON CONFLICT (habit_id, date)
    DO UPDATE SET count = ${total}, updated_at = NOW()
    RETURNING id, user_id, habit_id, date, count
  `

  res.json(formatCheckInRow(rows[0]))
}

// DELETE /api/habits/:id/checkins/:date
// Removes that day's check-in. Responds 204. Error: 404 no check-in on that day.
export async function undoCheckIn(req, res) {
  const sql = getDb()
  const habitId = parseInt(req.params.id, 10)
  if (isNaN(habitId)) return res.status(404).json({ message: 'Habit not found' })

  const deleted = await sql`
    DELETE FROM check_ins 
    WHERE habit_id = ${habitId} AND user_id = ${req.userId} AND date = ${req.params.date}
    RETURNING id
  `
  if (deleted.length === 0) {
    return res.status(404).json({ message: 'No check-in found for that day' })
  }
  res.status(204).end()
}

// GET /api/habits/:id/history?today=&from=&to=
// Responds 200 { habit, checkIns: [{ date, count, completed }], streak, weeks? } for the date range
// (default: the last 30 days). weeks (week start, total, completed) is only included for weekly habits.
// Errors: 404 not found, 400 bad dates.
export async function getHistory(req, res) {
  const sql = getDb()
  await ensureCustomDaysColumn(sql)
  const habitId = parseInt(req.params.id, 10)
  if (isNaN(habitId)) return res.status(404).json({ message: 'Habit not found' })

  const habits = await sql`
    SELECT * FROM habits WHERE id = ${habitId} AND user_id = ${req.userId}
  `
  if (habits.length === 0) return res.status(404).json({ message: 'Habit not found' })

  const habit = formatHabitRow(habits[0])
  const { today = toDateKey() } = req.query
  const { to = today, from = addDays(to, -29) } = req.query

  for (const value of [today, from, to]) {
    if (!isValidDateKey(value)) {
      return res.status(400).json({ message: 'from, to and today must be real days in YYYY-MM-DD format' })
    }
  }

  const allCheckInsRaw = await sql`
    SELECT date, count FROM check_ins
    WHERE habit_id = ${habitId} AND user_id = ${req.userId}
    ORDER BY date ASC
  `
  const allCheckIns = allCheckInsRaw.map((r) => ({ date: r.date, count: Number(r.count) }))

  const { streak, weekTotals } = summarise(habit, allCheckIns, today)
  const reached = (total) => total >= habit.target.amount

  // A weekly habit's day counts as completed when its whole WEEK reached the target
  function isCompleted(checkIn) {
    if (weekTotals) return reached(weekTotals.get(weekStart(checkIn.date)))
    return reached(checkIn.count)
  }

  const checkIns = allCheckIns
    .filter((c) => c.date >= from && c.date <= to)
    .map((c) => ({ date: c.date, count: c.count, completed: isCompleted(c) }))

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
