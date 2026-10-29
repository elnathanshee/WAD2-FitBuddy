// =============================================================================
// [IS216 Project Addition: OneSignal Notification Service]
// Technology: Node.js (fetch) + OneSignal REST API (v1 / v2)
//
// Dispatches Web Push Notifications to user devices via OneSignal.
// Used for habit check-in reminders, friend cheers, and challenge alerts.
// Includes a graceful simulated fallback when API keys are not yet configured.
// =============================================================================

import { getOneSignalConfig } from '../config/onesignal.js'

const ONESIGNAL_API_URL = 'https://api.onesignal.com/notifications'

/**
 * Sends a push notification through OneSignal REST API.
 * Supports targeting specific users by their HabitBuddy userId (external_id),
 * or broadcasting to all subscribed players.
 */
export async function sendPushNotification({
  userIds = [],
  title = 'HabitBuddy',
  message = '',
  url = null,
  data = {},
  broadcast = false,
}) {
  const { appId, restApiKey, isConfigured } = getOneSignalConfig()

  // Graceful simulation mode when OneSignal credentials are not set
  if (!isConfigured) {
    console.log('[OneSignal Simulated Push]', {
      targets: broadcast ? 'ALL_SUBSCRIBERS' : userIds,
      title,
      message,
      url,
    })
    return {
      success: true,
      simulated: true,
      message:
        'OneSignal keys not configured in server/.env. Notification simulated successfully in local console mode.',
      notification: { title, message, userIds, broadcast, url },
    }
  }

  // OneSignal REST API payload
  const payload = {
    app_id: appId,
    target_channel: 'push',
    headings: { en: title },
    contents: { en: message },
    data: { ...data, timestamp: new Date().toISOString() },
  }

  if (url) {
    payload.url = url
  }

  if (broadcast) {
    payload.included_segments = ['Total Subscriptions']
  } else if (userIds.length > 0) {
    const stringIds = userIds.map((id) => String(id))
    // OneSignal v2 aliases + v1 external_user_ids for maximum cross-compatibility
    payload.include_aliases = { external_id: stringIds }
    payload.include_external_user_ids = stringIds
  } else {
    return {
      success: false,
      message: 'No recipient userIds specified and broadcast was not set.',
    }
  }

  try {
    const response = await fetch(ONESIGNAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Key ${restApiKey}`,
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()

    if (!response.ok) {
      console.warn('[OneSignal API Warning/Error]', result)
      return {
        success: false,
        status: response.status,
        errors: result.errors || [result.message || 'OneSignal API rejected the request'],
      }
    }

    const recipientsCount = typeof result.recipients === 'number' ? result.recipients : (result.id ? 1 : 0)

    return {
      success: true,
      simulated: false,
      id: result.id,
      recipients: recipientsCount,
      errors: result.errors || null,
      message:
        recipientsCount === 0
          ? 'Notification processed by OneSignal! However, no active device subscriptions are registered yet. Click "Enable" in the app on this device to subscribe!'
          : `Notification successfully sent to ${recipientsCount} subscriber(s)!`,
    }
  } catch (err) {
    console.error('[OneSignal Error]', err)
    return {
      success: false,
      error: err.message,
    }
  }
}

/**
 * Sends a daily habit check-in reminder to an athlete.
 */
export async function sendHabitReminder(userId, { habitNames = [], remainingCount = 0 } = {}) {
  const count = remainingCount || habitNames.length

  let message = "Don't forget to check in on your habits today to keep your streak alive! 🏃"
  if (habitNames.length > 0) {
    const sample = habitNames.slice(0, 2).join(', ')
    const more = habitNames.length > 2 ? ` (+${habitNames.length - 2} more)` : ''
    message = `You still have ${count} habit(s) to complete today: ${sample}${more}. Keep your streak going! 🔥`
  }

  return sendPushNotification({
    userIds: [userId],
    title: '⏰ HabitBuddy Reminder',
    message,
    url: '/habits',
    data: { type: 'habit_reminder', remainingCount: count },
  })
}

/**
 * Sends a notification when a friend cheers or nudges the user.
 */
export async function sendCheerNotification(recipientId, { senderName = 'A friend', cheerType = 'cheer', message = '' } = {}) {
  const emojiMap = {
    cheer: '🎉',
    nudge: '👋',
    fire: '🔥',
    celebrate: '🏆',
  }
  const emoji = emojiMap[cheerType] || '🎉'
  const title = `${emoji} ${senderName} sent you a ${cheerType}!`
  const body = message ? `"${message}"` : 'Keep up the momentum and stay consistent!'

  return sendPushNotification({
    userIds: [recipientId],
    title,
    message: body,
    url: '/leaderboard',
    data: { type: 'friend_cheer', cheerType, senderName },
  })
}

/**
 * Sends a notification when a friend challenges the user.
 */
export async function sendChallengeNotification(opponentId, { creatorName = 'A friend', title = 'Challenge', targetDays = 7 } = {}) {
  return sendPushNotification({
    userIds: [opponentId],
    title: `⚔️ Challenge from ${creatorName}!`,
    message: `${creatorName} challenged you to "${title}" (${targetDays} days). Tap to view and accept!`,
    url: '/home',
    data: { type: 'challenge_invite', creatorName, title },
  })
}

