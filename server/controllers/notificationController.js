// =============================================================================
// [IS216 Project Addition: OneSignal Notification Controller]
// Technology: Express.js + OneSignal REST API
// =============================================================================

import { getOneSignalConfig } from '../config/onesignal.js'
import {
  sendPushNotification,
  sendHabitReminder as sendReminderService,
} from '../services/notificationService.js'
import { getDb } from '../config/neon.js'
import { toDateKey } from '../utils/dates.js'

/**
 * GET /api/notifications/status
 * Returns OneSignal configuration status so the frontend can display setup hints.
 */
export async function getStatus(req, res) {
  const config = getOneSignalConfig()
  res.json({
    configured: config.isConfigured,
    appId: config.appId ? `${config.appId.slice(0, 8)}...` : null,
    fullAppId: config.appId || null,
  })
}

/**
 * POST /api/notifications/test
 * Sends an immediate test notification to the authenticated user.
 */
export async function sendTestNotification(req, res) {
  const { title = '🎉 HabitBuddy Test Notification', message = 'OneSignal push notifications are working smoothly!' } =
    req.body || {}

  const result = await sendPushNotification({
    userIds: [req.userId],
    title,
    message,
    url: '/home',
    data: { test: true },
  })

  res.json(result)
}

/**
 * POST /api/notifications/remind-habits
 * Scans the current user's habits for today, identifies pending ones, and pushes a reminder.
 */
export async function remindHabits(req, res) {
  const userId = req.userId
  const today = toDateKey()
  const pendingHabitNames = []

  try {
    const sql = getDb()
    const habitRows = await sql`
      SELECT h.id, h.name, h.frequency, h.target_amount,
             COALESCE(SUM(c.count), 0)::float as today_logged
      FROM habits h
      LEFT JOIN check_ins c ON c.habit_id = h.id AND c.date = ${today}
      WHERE h.user_id = ${userId}
      GROUP BY h.id, h.name, h.frequency, h.target_amount
    `

    for (const h of habitRows) {
      if (h.frequency !== 'weekly' && h.today_logged < Number(h.target_amount)) {
        pendingHabitNames.push(h.name)
      }
    }
  } catch (neonErr) {
    // ignore, will use generic message
  }

  const result = await sendReminderService(userId, {
    habitNames: pendingHabitNames,
    remainingCount: pendingHabitNames.length,
  })

  res.json({
    ...result,
    pendingHabits: pendingHabitNames,
  })
}

/**
 * POST /api/notifications/broadcast
 * Broadcasts an announcement notification to all subscribed athletes.
 */
export async function broadcastNotification(req, res) {
  const { title = '📢 HabitBuddy Announcement', message = 'Check out this week’s leaderboard!' } = req.body || {}

  const result = await sendPushNotification({
    broadcast: true,
    title,
    message,
    url: '/leaderboard',
  })

  res.json(result)
}

