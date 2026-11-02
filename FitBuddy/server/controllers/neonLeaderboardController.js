// Handlers for /api/leaderboard (the Leaderboard page): the weekly ranking, my own score, my
// profile name/colour, and cheers and nudges between athletes. All need a logged-in user.
// Points are never stored: they are calculated from check-ins each time (rules in services/pointsService.js).

import { getDb } from '../config/neon.js'
import {
  completedPeriodsByHabit,
  historyRange,
  scoreWeek,
  POINTS,
} from '../services/pointsService.js'
import { addDays, weekStart, resolveToday } from '../utils/dates.js'
import { relationFor, otherUserId } from '../utils/friends.js'
import { sendCheerNotification } from '../services/notificationService.js'

// A check-in query row -> the shape pointsService.js expects
function toScoringRow(row) {
  return {
    userId: row.user_id,
    habitId: row.habit_id,
    date: row.date,
    logged: row.logged,
    frequency: row.frequency,
    target: row.target,
  }
}

// Map of userId -> that user's scoring rows
function groupRowsByUser(progressRows) {
  const rowsByUser = new Map()
  for (const row of progressRows) {
    if (!rowsByUser.has(row.user_id)) rowsByUser.set(row.user_id, [])
    rowsByUser.get(row.user_id).push(toScoringRow(row))
  }
  return rowsByUser
}

// Map of userId -> ids of that user's daily (not weekly) habits
function groupDailyHabitsByUser(habitRows) {
  const dailyHabitsByUser = new Map()
  for (const habit of habitRows) {
    if (habit.frequency === 'weekly') continue
    if (!dailyHabitsByUser.has(habit.user_id)) dailyHabitsByUser.set(habit.user_id, [])
    dailyHabitsByUser.get(habit.user_id).push(habit.id)
  }
  return dailyHabitsByUser
}

// Map of recipientId -> Set of cheer types ('cheer', 'nudge') I already sent them today
function groupSentTypesByRecipient(sentRows) {
  const sentTodayTypes = groupSentTypesByRecipient(sentRows)
  return sentTodayTypes
}

// Adds a rank to each (already sorted) entry. Athletes with equal points share a rank.
function addRanks(sortedEntries) {
  let rank = 0
  let previousPoints = null
  return sortedEntries.map((entry, index) => {
    if (entry.points !== previousPoints) {
      rank = index + 1
      previousPoints = entry.points
    }
    return { ...entry, rank }
  })
}

// GET /api/leaderboard/weekly?today=YYYY-MM-DD
// Responds 200 { weekStart, weekEnd, entries, rules }. Each entry is one athlete with points, a score
// breakdown, cheersCount, what I already sent them today (sentToday), friendStatus and rank.
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

  const rowsByUser = groupRowsByUser(progressRows)
  const dailyHabitsByUser = groupDailyHabitsByUser(habitRows)

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

  const entries = addRanks(scored)

  res.json({
    weekStart: weekStartKey,
    weekEnd: weekEndKey,
    entries,
    rules: POINTS,
  })
}

// The weekly points breakdown for one user: { weekStart, ...breakdown, rules }.
// Used by GET /api/leaderboard/me and by friendController.js for a friend's profile.
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

  const formattedRows = progressRows.map(toScoringRow)

  const breakdown = scoreWeek({
    byHabit: completedPeriodsByHabit(formattedRows),
    weekStartKey,
    dailyHabitIds: habitRows.filter((h) => h.frequency !== 'weekly').map((h) => h.id),
  })

  return { weekStart: weekStartKey, ...breakdown, rules: POINTS }
}

// GET /api/leaderboard/me?today=YYYY-MM-DD
// Responds 200 { userId, weekStart, completions, completionPoints, ..., total, rules } for the logged-in user.
export async function myScore(req, res) {
  const result = await weeklyBreakdown(req.userId, resolveToday(req.query.today))
  res.json({ userId: req.userId, ...result })
}

// PUT /api/leaderboard/profile
// Body: { displayName (required, max 60), avatarColor? }. Creates or updates the user's row.
// Responds 200 { userId, displayName, avatarColor }. Error: 400 missing displayName.
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

// Sends the push notification for a cheer. Never blocks or fails the request.
async function notifyRecipient(sql, senderId, recipientId, cheerType, message) {
  try {
    const [sender] = await sql`SELECT display_name FROM users WHERE user_id = ${senderId}`
    sendCheerNotification(recipientId, {
      senderName: sender?.display_name || 'An athlete',
      cheerType,
      message,
    }).catch((err) => console.warn('[OneSignal Cheer Notification Warning]', err?.message))
  } catch (notifyErr) {
    // Non-blocking
  }
}

// POST /api/leaderboard/cheer
// Body: { recipientId, type = 'cheer' ('cheer', 'nudge', 'fire' or 'celebrate'), message? (max 100) }
// One of each type per sender and recipient per Singapore day.
// Responds 200 { success: true, message }. Errors: 400 missing recipient or yourself, 409 already sent today.
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

  // Tell the recipient by push notification
  await notifyRecipient(sql, req.userId, recipientId, cheerType, cleanMsg)

  res.json({ success: true, message: `Sent ${cheerType}!` })
}

// GET /api/leaderboard/cheers
// Responds 200 { cheers: [...] }: the 10 newest cheers and nudges I received, with the sender's name and colour.
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
