// Handlers for /api/notifications: OneSignal configuration status, a test push to yourself,
// a reminder for today's unfinished habits, a day-ending urgent warning, and a broadcast.
// All routes need a logged-in user. The OneSignal calls live in services/notificationService.js.

import { getDb } from '../config/neon.js'
import { resolveToday } from '../utils/dates.js'
import {
  isOneSignalConfigured,
  sendPushNotification,
  sendHabitReminder,
  sendDayEndingNotification,
} from '../services/notificationService.js'

function getTimeRemainingToday() {
  const now = new Date()
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  const diffMs = Math.max(0, endOfDay.getTime() - now.getTime())
  const totalMinutes = Math.max(1, Math.ceil(diffMs / 60000))
  const hoursLeft = Math.floor(totalMinutes / 60)
  const minutesLeft = totalMinutes % 60
  return { hoursLeft, minutesLeft }
}

function getTodayWeekdayShort() {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return names[new Date().getDay()]
}

async function queryUnfinishedHabitsDueToday(userId, today, todayWeekday = getTodayWeekdayShort()) {
  if (!process.env.DATABASE_URL) {
    return []
  }
  try {
    const sql = getDb()
    const habits = await sql`
      SELECT h.id, h.name, h.frequency, h.target_amount, h.custom_days,
             COALESCE(c.count, 0) AS today_count
      FROM habits h
      LEFT JOIN check_ins c
        ON c.habit_id = h.id AND c.user_id = h.user_id AND c.date = ${today}
      WHERE h.user_id = ${userId}
    `

    return habits.filter((h) => {
      const doneToday = Number(h.today_count) >= Number(h.target_amount)
      if (h.frequency !== 'weekly') {
        return !doneToday
      }
      if (Array.isArray(h.custom_days) && h.custom_days.length > 0) {
        if (!h.custom_days.includes(todayWeekday)) {
          return false
        }
      }
      return Number(h.today_count) <= 0
    })
  } catch {
    return []
  }
}

// GET /api/notifications/status
export async function getStatus(_req, res) {
  res.json({
    configured: isOneSignalConfigured(),
    appId: process.env.ONESIGNAL_APP_ID || null,
    provider: 'onesignal',
  })
}

// POST /api/notifications/test
export async function sendTestNotification(req, res) {
  const {
    title = '🚀 FitBuddy Notification Active!',
    message = 'Your OneSignal push notifications are connected and ready to keep your streaks alive.',
  } = req.body || {}

  try {
    const result = await sendPushNotification({
      userIds: [String(req.userId)],
      title,
      message,
      data: { type: 'test_notification' },
    })
    res.json(result)
  } catch (err) {
    res.status(502).json({
      success: false,
      message: err.message || 'Failed to send OneSignal notification',
    })
  }
}

// POST /api/notifications/remind-habits
export async function remindHabits(req, res) {
  try {
    const today = resolveToday(req.body?.today ?? req.query?.today)
    const todayWeekday = req.body?.todayWeekday || getTodayWeekdayShort()
    const incomplete = await queryUnfinishedHabitsDueToday(req.userId, today, todayWeekday)
    const habitNames = incomplete.map((h) => h.name)

    const result = await sendHabitReminder(req.userId, {
      habitNames,
      remainingCount: incomplete.length,
    })

    res.json({
      ...result,
      remainingCount: incomplete.length,
      incompleteHabits: habitNames,
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to process habit reminder notification',
    })
  }
}

// POST /api/notifications/day-ending
export async function remindDayEnding(req, res) {
  try {
    const today = resolveToday(req.body?.today ?? req.query?.today)
    const todayWeekday = req.body?.todayWeekday || getTodayWeekdayShort()
    const incomplete = await queryUnfinishedHabitsDueToday(req.userId, today, todayWeekday)
    const habitNames =
      Array.isArray(req.body?.habitNames) && req.body.habitNames.length > 0
        ? req.body.habitNames
        : incomplete.map((h) => h.name)
    const remainingCount = habitNames.length
    const fallbackTime = getTimeRemainingToday()
    const hoursLeft = Number.isFinite(Number(req.body?.hoursLeft))
      ? Number(req.body.hoursLeft)
      : fallbackTime.hoursLeft
    const minutesLeft = Number.isFinite(Number(req.body?.minutesLeft))
      ? Number(req.body.minutesLeft)
      : fallbackTime.minutesLeft

    const result = await sendDayEndingNotification(req.userId, {
      habitNames,
      remainingCount,
      hoursLeft,
      minutesLeft,
    })

    res.json({
      ...result,
      remainingCount,
      incompleteHabits: habitNames,
      hoursLeft,
      minutesLeft,
      todayWeekday,
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to send day-ending warning notification',
    })
  }
}

// POST /api/notifications/broadcast
export async function broadcastNotification(req, res) {
  const { title, message, userIds = [] } = req.body || {}
  if (!title || !message) {
    return res.status(400).json({ message: 'Both title and message are required' })
  }

  try {
    const result = await sendPushNotification({
      userIds,
      title,
      message,
      data: { type: 'broadcast' },
    })
    res.json(result)
  } catch (err) {
    res.status(502).json({
      success: false,
      message: err.message || 'Failed to broadcast notification',
    })
  }
}
