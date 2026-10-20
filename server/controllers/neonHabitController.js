// =============================================================================
// [IS216 Project Addition: Neon PostgreSQL Habit Controller]
// Technology: Node.js + PostgreSQL via @neondatabase/serverless
//
// Implements full Habit CRUD, atomic check-ins, history, and streak calculation
// matching the database schema and frontend expectations.
// =============================================================================

import { getDb } from '../config/neon.js'
import { calculateStreak } from '../utils/streak.js'
import { toDateKey, addDays, weekStart } from '../utils/dates.js'

const MAX_AMOUNT = 100000

function roundAmount(value) {
  return Math.round(value * 100) / 100
}

function isValidDateKey(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && addDays(value, 0) === value
}

function dateError(date) {
  if (!isValidDateKey(date)) return 'date must be a real day in YYYY-MM-DD format'
  if (date > toDateKey()) return 'Cannot check in for a future date'
  return null
}

function formatHabitRow(row) {
  return {
    _id: String(row.id),
    id: row.id,
    userId: row.user_id,
    name: row.name,
    category: row.category,
    frequency: row.frequency,
    target: {
      amount: Number(row.target_amount),
      unit: row.target_unit,
    },
    icon: row.icon,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

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
export async function listHabits(req, res) {
  const sql = getDb()
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
export async function createHabit(req, res) {
  const sql = getDb()
  const { name, category = 'other', frequency = 'daily', target, icon = '✅' } = req.body || {}

  const trimmedName = String(name || '').trim()
  if (!trimmedName) return res.status(400).json({ message: 'Habit name is required' })
  if (trimmedName.length > 50) return res.status(400).json({ message: 'Habit name must be 50 characters or fewer' })

  const amount = Number(target?.amount)
  if (!amount || amount <= 0 || amount > MAX_AMOUNT) {
    return res.status(400).json({ message: `Target amount must be a number between 0.01 and ${MAX_AMOUNT}` })
  }
  const unit = String(target?.unit || 'times').slice(0, 20).trim()

  const rows = await sql`
    INSERT INTO habits (user_id, name, category, frequency, target_amount, target_unit, icon)
    VALUES (${req.userId}, ${trimmedName}, ${category}, ${frequency}, ${roundAmount(amount)}, ${unit}, ${icon})
    RETURNING *
  `

  res.status(201).json(formatHabitRow(rows[0]))
}

// GET /api/habits/:id
export async function getHabit(req, res) {
  const sql = getDb()
  const habitId = parseInt(req.params.id, 10)
  if (isNaN(habitId)) return res.status(404).json({ message: 'Habit not found' })

  const rows = await sql`
    SELECT * FROM habits WHERE id = ${habitId} AND user_id = ${req.userId}
  `
  if (rows.length === 0) return res.status(404).json({ message: 'Habit not found' })

  res.json(formatHabitRow(rows[0]))
}

// PUT /api/habits/:id
export async function updateHabit(req, res) {
  const sql = getDb()
  const habitId = parseInt(req.params.id, 10)
  if (isNaN(habitId)) return res.status(404).json({ message: 'Habit not found' })

  const existing = await sql`
    SELECT * FROM habits WHERE id = ${habitId} AND user_id = ${req.userId}
  `
  if (existing.length === 0) return res.status(404).json({ message: 'Habit not found' })

  const current = existing[0]
  const { name, category, frequency, target, icon } = req.body || {}

  const newName = name !== undefined ? String(name).trim() : current.name
  if (!newName) return res.status(400).json({ message: 'Habit name is required' })

  const newCategory = category !== undefined ? String(category).trim() : current.category
  const newFrequency = frequency !== undefined ? String(frequency).trim() : current.frequency
  const newIcon = icon !== undefined ? String(icon).trim() : current.icon

  let newAmount = current.target_amount
  let newUnit = current.target_unit
  if (target && typeof target === 'object') {
    if (target.amount !== undefined) newAmount = roundAmount(Number(target.amount))
    if (target.unit !== undefined) newUnit = String(target.unit).trim()
  }

  const updated = await sql`
    UPDATE habits
    SET name = ${newName}, category = ${newCategory}, frequency = ${newFrequency},
        target_amount = ${newAmount}, target_unit = ${newUnit}, icon = ${newIcon},
        updated_at = NOW()
    WHERE id = ${habitId} AND user_id = ${req.userId}
    RETURNING *
  `

  res.json(formatHabitRow(updated[0]))
}

// DELETE /api/habits/:id
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
  res.status(isCreated ? 201 : 200).json({
    _id: String(rows[0].id),
    userId: rows[0].user_id,
    habitId: String(rows[0].habit_id),
    date: rows[0].date,
    count: Number(rows[0].count),
  })
}

// PUT /api/habits/:id/checkins/:date
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

  res.json({
    _id: String(rows[0].id),
    userId: rows[0].user_id,
    habitId: String(rows[0].habit_id),
    date: rows[0].date,
    count: Number(rows[0].count),
  })
}

// DELETE /api/habits/:id/checkins/:date
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

// GET /api/habits/:id/history
export async function getHistory(req, res) {
  const sql = getDb()
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

  const isCompleted = weekTotals
    ? (checkIn) => reached(weekTotals.get(weekStart(checkIn.date)))
    : (checkIn) => reached(checkIn.count)

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

