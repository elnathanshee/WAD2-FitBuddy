// Sends push notifications through OneSignal's REST API (https://onesignal.com/api/v1/notifications)
// using ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY from .env. When those keys are not set,
// returns { simulated: true } so the app and tests still work without a OneSignal account.
// Called by controllers/notificationController.js.

const ONESIGNAL_API_URL = 'https://onesignal.com/api/v1/notifications'

function getOneSignalConfig() {
  return {
    appId: process.env.ONESIGNAL_APP_ID || '',
    restApiKey: process.env.ONESIGNAL_REST_API_KEY || '',
  }
}

export function isOneSignalConfigured() {
  const { appId, restApiKey } = getOneSignalConfig()
  return Boolean(appId && restApiKey)
}

/**
 * Send a push notification via OneSignal REST API
 * @param {Object} options
 * @param {string[]} [options.userIds] - External user IDs (maps to FitBuddy user_id)
 * @param {string} options.title - Notification heading
 * @param {string} options.message - Notification body content
 * @param {string} [options.url] - Optional click target URL
 * @param {Object} [options.data] - Optional custom payload data
 */
export async function sendPushNotification({ userIds = [], title, message, url, data = {} }) {
  const { appId, restApiKey } = getOneSignalConfig()

  // Graceful fallback when OneSignal keys are not configured in .env
  if (!appId || !restApiKey) {
    return {
      success: true,
      simulated: true,
      provider: 'onesignal',
      notification: {
        title,
        message,
        targetUsers: userIds.length > 0 ? userIds : ['all_subscribed'],
        data,
        timestamp: new Date().toISOString(),
      },
    }
  }

  const payload = {
    app_id: appId,
    headings: { en: title },
    contents: { en: message },
    data,
  }

  if (url) {
    payload.url = url
  }

  if (userIds.length > 0) {
    payload.include_aliases = { external_id: userIds.map(String) }
    payload.target_channel = 'push'
  } else {
    payload.included_segments = ['Subscribed Users']
  }

  const response = await fetch(ONESIGNAL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Basic ${restApiKey}`,
    },
    body: JSON.stringify(payload),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.errors?.[0] || `OneSignal API error (${response.status})`)
  }

  return {
    success: true,
    simulated: false,
    provider: 'onesignal',
    id: result.id,
    recipients: result.recipients,
    notification: {
      title,
      message,
      targetUsers: userIds.length > 0 ? userIds : ['all_subscribed'],
      timestamp: new Date().toISOString(),
    },
  }
}

/**
 * Send a habit reminder notification for incomplete daily habits
 */
export async function sendHabitReminder(userId, { habitNames = [], remainingCount = 0 }) {
  const title = remainingCount > 0
    ? `⏰ ${remainingCount} Habit${remainingCount > 1 ? 's' : ''} Waiting Today!`
    : '🎉 All Habits Complete Today!'

  const preview = habitNames.slice(0, 3).join(', ')
  const message = remainingCount > 0
    ? `Don't break your streak! Still left today: ${preview}${habitNames.length > 3 ? '...' : ''}.`
    : 'Awesome consistency! You completed every habit on your list today.'

  return sendPushNotification({
    userIds: [String(userId)],
    title,
    message,
    data: { type: 'habit_reminder', remainingCount },
  })
}

/**
 * Send an urgent notification when time is running out / the day is about to end
 */
export async function sendDayEndingNotification(
  userId,
  { habitNames = [], remainingCount = 0, hoursLeft = 0, minutesLeft = 0 }
) {
  const timeText = hoursLeft > 0 ? `${hoursLeft}h ${minutesLeft}m` : `${minutesLeft}m`
  const title =
    remainingCount > 0
      ? `⏳ Time is Running Out! (${timeText} left today)`
      : '🌙 Day Ending Soon — All Habits Complete!'

  const preview = habitNames.slice(0, 3).join(', ')
  const message =
    remainingCount > 0
      ? `The day is about to end and ${remainingCount} habit${remainingCount > 1 ? 's are' : ' is'} still unfinished: ${preview}${habitNames.length > 3 ? '...' : ''}. Log now before midnight!`
      : 'Great job finishing all your habits before the day ends!'

  return sendPushNotification({
    userIds: [String(userId)],
    title,
    message,
    data: { type: 'day_ending_warning', remainingCount, hoursLeft, minutesLeft },
  })
}

/**
 * Send a cheer notification when another user cheers/nudges on the leaderboard
 */
export async function sendCheerNotification(recipientId, { senderName = 'A FitBuddy athlete', cheerType = 'cheer', message = '' }) {
  const emojiMap = {
    cheer: '👏',
    fire: '🔥',
    muscle: '💪',
    star: '⭐',
    nudge: '⚡',
  }
  const emoji = emojiMap[cheerType] || '👏'

  return sendPushNotification({
    userIds: [String(recipientId)],
    title: `${emoji} ${senderName} sent you a ${cheerType}!`,
    message: message || 'Keep pushing your daily habits on the FitBuddy Leaderboard!',
    data: { type: 'leaderboard_cheer', cheerType, senderName },
  })
}

/**
 * Send a challenge notification when a friend invites or completes a challenge
 */
export async function sendChallengeNotification(opponentId, { creatorName = 'A friend', title = '7-Day Habit Duel', targetDays = 7 }) {
  return sendPushNotification({
    userIds: [String(opponentId)],
    title: `🏆 New FitBuddy Challenge: ${title}`,
    message: `${creatorName} challenged you to a ${targetDays}-day habit duel!`,
    data: { type: 'friend_challenge', title, targetDays },
  })
}
