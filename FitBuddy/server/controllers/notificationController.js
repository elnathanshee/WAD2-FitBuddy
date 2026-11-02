// Handlers for /api/notifications (OneSignal push notifications). All need a logged-in user.
// The actual sending lives in services/notificationService.js.

import { getOneSignalConfig } from '../config/onesignal.js'
import {
  sendPushNotification,
  sendHabitReminder as sendReminderService,
} from '../services/notificationService.js'
import { getDb } from '../config/neon.js'
import { toDateKey } from '../utils/dates.js'

/**
 * GET /api/notifications/status
 * Responds 200 { configured, appId (shortened), fullAppId } so the frontend can show setup hints.
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
 * Body (optional): { title, message }. Sends a test push to the logged-in user and responds with the result.
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

// Names of the user's daily habits whose target is not yet met today.
async function findPendingDailyHabitNames(userId, today) {
  const sql = getDb()
  const habitRows = await sql`
    SELECT h.id, h.name, h.frequency, h.target_amount,
           COALESCE(SUM(c.count), 0)::float as today_logged
    FROM habits h
    LEFT JOIN check_ins c ON c.habit_id = h.id AND c.date = ${today}
    WHERE h.user_id = ${userId}
    GROUP BY h.id, h.name, h.frequency, h.target_amount
  `

  const pendingNames = []
  for (const habit of habitRows) {
    const isDaily = habit.frequency !== 'weekly'
    if (isDaily && habit.today_logged < Number(habit.target_amount)) {
      pendingNames.push(habit.name)
    }
  }
  return pendingNames
}

/**
 * POST /api/notifications/remind-habits
 * Finds today's unfinished daily habits and pushes a reminder. Responds with the send result plus pendingHabits.
 */
export async function remindHabits(req, res) {
  const userId = req.userId
  const today = toDateKey()
  let pendingHabitNames = []

  try {
    pendingHabitNames = await findPendingDailyHabitNames(userId, today)
  } catch (dbError) {
    // ignore: the reminder falls back to the generic message
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
 * Body (optional): { title, message }. Sends an announcement push to every subscriber.
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

