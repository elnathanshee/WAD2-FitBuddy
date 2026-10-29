// =============================================================================
// [IS216 Project Addition: Neon PostgreSQL Leaderboard Controller]
// Technology: Node.js + PostgreSQL via @neondatabase/serverless
//
// Computes live weekly leaderboard points, user rankings, streaks, and cheers.
// =============================================================================

import { getDb } from '../config/neon.js'
import {
  completedPeriodsByHabit,
  historyRange,
  scoreWeek,
  POINTS,
} from '../services/pointsService.js'
import { toDateKey, addDays, weekStart } from '../utils/dates.js'
import { relationFor, otherUserId } from '../utils/friends.js'
import { sendCheerNotification } from '../services/notificationService.js'

function resolveToday(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : toDateKey()
}

// GET /api/leaderboard/weekly
export async function weeklyLeaderboard(req, res) {
  const sql = getDb()
  const today = resolveToday(req.query.today)
  const weekStartKey = weekStart(today)
  const weekEndKey = addDays(weekStartKey, 6)
  const { from, to } = historyRange(weekStartKey)

  // 1. Fetch raw progress rows
  const progressRows = await sql`
    SELECT 
      c.user_id,
      c.habit_id::text,
      c.date,
      SUM(c.count)::float AS logged,
      h.frequency,
      h.target_amount::float AS target
    FROM check_ins c
    JOIN habits h ON c.habit_id = h.id
    WHERE c.date >= ${from} AND c.date <= ${to}
    GROUP BY c.user_id, c.habit_id, c.date, h.frequency, h.target_amount
  `

  // 2. Fetch all habits & user profiles & cheers & the current user's friendships
  const [habitRows, profileRows, cheerCounts, sentRows, friendRows] = await Promise.all([
    sql`SELECT id::text, user_id, frequency FROM habits`,
    sql`SELECT user_id, display_name, avatar_color FROM users`,
    sql`
      SELECT recipient_id, COUNT(*)::int AS count
      FROM cheers
      GROUP BY recipient_id
    `.catch(() => []),
    // What the current user has already sent today, so the UI can disable those buttons
    sql`
      SELECT recipient_id, type
      FROM cheers
      WHERE sender_id = ${req.userId}
        AND sent_on = (NOW() AT TIME ZONE 'Asia/Singapore')::date
    `.catch(() => []),
    // Friend requests and friendships involving the current user
    sql`
      SELECT id, requester_id, addressee_id, status
      FROM friendships
      WHERE requester_id = ${req.userId} OR addressee_id = ${req.userId}
    `.catch(() => []),
  ])

  const cheersByRecipient = new Map(cheerCounts.map((c) => [c.recipient_id, c.count]))
  const sentTodayTypes = new Map()
  for (const row of sentRows) {
    if (!sentTodayTypes.has(row.recipient_id)) sentTodayTypes.set(row.recipient_id, new Set())
    sentTodayTypes.get(row.recipient_id).add(row.type)
  }

  // The other person's id → my friendships row with them
  const friendshipByUser = new Map(friendRows.map((f) => [otherUserId(f, req.userId), f]))

  const userIds = new Set([
    ...profileRows.map((p) => p.user_id),
    ...habitRows.map((h) => h.user_id),
    ...progressRows.map((r) => r.user_id),
  ])

  const rowsByUser = new Map()
  for (const row of progressRows) {
    if (!rowsByUser.has(row.user_id)) rowsByUser.set(row.user_id, [])
    rowsByUser.get(row.user_id).push({
      userId: row.user_id,
      habitId: row.habit_id,
      date: row.date,
      logged: row.logged,
      frequency: row.frequency,
      target: row.target,
    })
  }

  const dailyHabitsByUser = new Map()
  for (const habit of habitRows) {
    if (habit.frequency === 'weekly') continue
    if (!dailyHabitsByUser.has(habit.user_id)) dailyHabitsByUser.set(habit.user_id, [])
    dailyHabitsByUser.get(habit.user_id).push(habit.id)
  }

  const profileByUser = new Map(profileRows.map((p) => [p.user_id, p]))

  const scored = [...userIds].map((userId) => {
    const byHabit = completedPeriodsByHabit(rowsByUser.get(userId) ?? [])
    const breakdown = scoreWeek({
      byHabit,
      weekStartKey,
      dailyHabitIds: dailyHabitsByUser.get(userId) ?? [],
    })
    const profile = profileByUser.get(userId)
    const isCurrentUser = req.userId != null && String(userId) === String(req.userId)
    const friendship = friendshipByUser.get(userId)
    return {
      userId,
      displayName: profile?.display_name ?? `User ${userId}`,
      avatarColor: profile?.avatar_color ?? '#7FA3D1',
      points: breakdown.total,
      breakdown,
      cheersCount: cheersByRecipient.get(userId) || 0,
      sentToday: {
        cheer: sentTodayTypes.get(userId)?.has('cheer') ?? false,
        nudge: sentTodayTypes.get(userId)?.has('nudge') ?? false,
      },
      isCurrentUser,
      friendStatus: isCurrentUser ? 'self' : relationFor(friendship, req.userId),
      friendRequestId: friendship?.id ?? null,
    }
  })

  scored.sort((a, b) => b.points - a.points || a.displayName.localeCompare(b.displayName))

  let rank = 0
  let previousPoints = null
  const entries = scored.map((entry, index) => {
    if (entry.points !== previousPoints) {
      rank = index + 1
      previousPoints = entry.points
    }
    return { ...entry, rank }
  })

  res.json({
    weekStart: weekStartKey,
    weekEnd: weekEndKey,
    entries,
    rules: POINTS,
  })
}

// The weekly points breakdown for one user (also used for friends' profiles)
export async function weeklyBreakdown(userId, today) {
  const sql = getDb()
  const weekStartKey = weekStart(today)
  const { from, to } = historyRange(weekStartKey)

  const [progressRows, habitRows] = await Promise.all([
    sql`
      SELECT 
        c.user_id,
        c.habit_id::text,
        c.date,
        SUM(c.count)::float AS logged,
        h.frequency,
        h.target_amount::float AS target
      FROM check_ins c
      JOIN habits h ON c.habit_id = h.id
      WHERE c.user_id = ${userId} AND c.date >= ${from} AND c.date <= ${to}
      GROUP BY c.user_id, c.habit_id, c.date, h.frequency, h.target_amount
    `,
    sql`
      SELECT id::text, frequency FROM habits WHERE user_id = ${userId}
    `,
  ])

  const formattedRows = progressRows.map((r) => ({
    userId: r.user_id,
    habitId: r.habit_id,
    date: r.date,
    logged: r.logged,
    frequency: r.frequency,
    target: r.target,
  }))

  const breakdown = scoreWeek({
    byHabit: completedPeriodsByHabit(formattedRows),
    weekStartKey,
    dailyHabitIds: habitRows.filter((h) => h.frequency !== 'weekly').map((h) => h.id),
  })

  return { weekStart: weekStartKey, ...breakdown, rules: POINTS }
}

// GET /api/leaderboard/me
export async function myScore(req, res) {
  const result = await weeklyBreakdown(req.userId, resolveToday(req.query.today))
  res.json({ userId: req.userId, ...result })
}

// PUT /api/leaderboard/profile
export async function upsertProfile(req, res) {
  const sql = getDb()
  const { displayName, avatarColor } = req.body ?? {}
  if (typeof displayName !== 'string' || displayName.trim().length === 0) {
    return res.status(400).json({ message: 'displayName is required' })
  }

  const trimmed = displayName.trim().slice(0, 60)
  const color = avatarColor || '#7FA3D1'

  const rows = await sql`
    INSERT INTO users (user_id, display_name, avatar_color)
    VALUES (${req.userId}, ${trimmed}, ${color})
    ON CONFLICT (user_id) 
    DO UPDATE SET display_name = EXCLUDED.display_name, avatar_color = EXCLUDED.avatar_color, updated_at = NOW()
    RETURNING user_id, display_name, avatar_color
  `

  res.json({
    userId: rows[0].user_id,
    displayName: rows[0].display_name,
    avatarColor: rows[0].avatar_color,
  })
}

// POST /api/leaderboard/cheer
export async function sendCheer(req, res) {
  const sql = getDb()
  const { recipientId, type = 'cheer', message = '' } = req.body || {}
  if (!recipientId) {
    return res.status(400).json({ message: 'recipientId is required' })
  }
  if (String(recipientId) === String(req.userId)) {
    return res.status(400).json({ message: 'You cannot cheer yourself!' })
  }

  const validTypes = ['cheer', 'nudge', 'fire', 'celebrate']
  const cheerType = validTypes.includes(type) ? type : 'cheer'
  const cleanMsg = String(message || '').slice(0, 100).trim()

  // sent_on is today's Singapore date, computed by the database so the limit
  // can't be dodged by changing the client's clock. The unique (sender,
  // recipient, type, sent_on) index enforces it, so a double-click or a second
  // tab can't slip a duplicate through.
  const inserted = await sql`
    INSERT INTO cheers (sender_id, recipient_id, type, message, sent_on)
    VALUES (${req.userId}, ${recipientId}, ${cheerType}, ${cleanMsg}, (NOW() AT TIME ZONE 'Asia/Singapore')::date)
    ON CONFLICT (sender_id, recipient_id, type, sent_on) DO NOTHING
    RETURNING id
  `

  if (inserted.length === 0) {
    const [recipient] = await sql`SELECT display_name FROM users WHERE user_id = ${recipientId}`
    const name = recipient?.display_name || 'them'
    return res.status(409).json({
      message: `You've already sent a ${cheerType} to ${name} today. Try again tomorrow!`,
    })
  }

  // Asynchronously trigger OneSignal push notification to the recipient
  try {
    const [sender] = await sql`SELECT display_name FROM users WHERE user_id = ${req.userId}`
    sendCheerNotification(recipientId, {
      senderName: sender?.display_name || 'An athlete',
      cheerType,
      message: cleanMsg,
    }).catch((err) => console.warn('[OneSignal Cheer Notification Warning]', err?.message))
  } catch (notifyErr) {
    // Non-blocking
  }

  res.json({ success: true, message: `Sent ${cheerType}!` })
}

// GET /api/leaderboard/cheers
export async function getCheers(req, res) {
  const sql = getDb()
  const rows = await sql`
    SELECT 
      c.id,
      c.sender_id,
      c.type,
      c.message,
      c.created_at,
      u.display_name AS sender_name,
      u.avatar_color AS sender_color
    FROM cheers c
    LEFT JOIN users u ON c.sender_id = u.user_id
    WHERE c.recipient_id = ${req.userId}
    ORDER BY c.created_at DESC
    LIMIT 10
  `
  res.json({ cheers: rows })
}
