// =============================================================================
// [IS216 Project Addition: OneSignal Frontend Notification Service]
// Technology: OneSignal Web SDK (v16) + Axios Backend API
// Third-party library: OneSignal (https://onesignal.com) — used for web push notifications.
// Its script is loaded in index.html and reached through window.OneSignalDeferred.
//
// Manages device push registration, user external_id linking, permission prompts,
// and triggering habit reminders, day-ending warnings, and test push alerts.
// =============================================================================

// Third-party library: Axios (https://axios-http.com) — used for HTTP calls to the Express API
import axios from 'axios'
import { authConfig } from './api'
import { useAuthStore } from '../stores/auth'
import { toDateKey } from '../utils/dates'
import { todayWeekdayShort } from '../utils/habitOptions'

const DAY_ENDING_THRESHOLD_KEY = 'fitbuddy_day_ending_threshold'
const DAY_ENDING_NOTIFIED_DATE_KEY = 'fitbuddy_day_ending_notified_date'

let isInitialized = false
let currentConfig = null

export function getTimeRemainingToday(now = new Date()) {
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  const diffMs = Math.max(0, endOfDay.getTime() - now.getTime())
  const totalMinutes = Math.max(1, Math.ceil(diffMs / 60000))
  const hoursLeft = Math.floor(totalMinutes / 60)
  const minutesLeft = totalMinutes % 60
  const timeText = hoursLeft > 0 ? `${hoursLeft}h ${minutesLeft}m` : `${minutesLeft}m`
  return { hoursLeft, minutesLeft, totalMinutes, timeText }
}

export function getUnfinishedHabitsDueToday(habits = []) {
  const todayDay = todayWeekdayShort()
  return (habits || []).filter((h) => {
    const targetAmt = Number(h.target?.amount ?? 1)
    const donePeriod = Number(h.periodCount ?? 0) >= targetAmt
    if (donePeriod) return false
    if (h.frequency !== 'weekly') return true
    if (Array.isArray(h.customDays) && h.customDays.length > 0) {
      return h.customDays.includes(todayDay) && Number(h.todayCount ?? 0) <= 0
    }
    return Number(h.todayCount ?? 0) <= 0
  })
}

export function showLocalBrowserNotification(title, body) {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
      })
    } catch {
      // Ignore on browsers that require SW registration
    }
  }
}

/**
 * Ensures the OneSignal Web SDK is properly initialized.
 */
export async function initOneSignal() {
  if (isInitialized || typeof window === 'undefined') return

  try {
    const status = await getNotificationStatus()
    currentConfig = status

    const appId =
      import.meta.env.VITE_ONESIGNAL_APP_ID ||
      status?.fullAppId ||
      status?.appId

    if (!appId || appId.includes('your_')) {
      console.info('[OneSignal] Client App ID not configured. Running in simulated push mode.')
      return
    }

    window.OneSignalDeferred = window.OneSignalDeferred || []
    window.OneSignalDeferred.push(async function (OneSignal) {
      await OneSignal.init({
        appId,
        allowLocalhostAsSecureOrigin: true,
        notifyButton: { enable: false },
      })

      isInitialized = true

      const auth = useAuthStore()
      if (auth.user?.id) {
        await OneSignal.login(String(auth.user.id))
      }
    })
  } catch (err) {
    console.warn('[OneSignal Init Error]', err)
  }
}

/**
 * Links the authenticated HabitBuddy user ID to OneSignal.
 */
export async function loginToOneSignal(userId) {
  if (!userId || typeof window === 'undefined') return

  window.OneSignalDeferred = window.OneSignalDeferred || []
  window.OneSignalDeferred.push(async function (OneSignal) {
    try {
      await OneSignal.login(String(userId))
    } catch (err) {
      console.warn('[OneSignal Login Warning]', err)
    }
  })
}

/**
 * Logs out of OneSignal on user sign out.
 */
export async function logoutFromOneSignal() {
  if (typeof window === 'undefined') return

  window.OneSignalDeferred = window.OneSignalDeferred || []
  window.OneSignalDeferred.push(async function (OneSignal) {
    try {
      await OneSignal.logout()
    } catch (err) {
      console.warn('[OneSignal Logout Warning]', err)
    }
  })
}

/**
 * Requests native browser permission for Web Push notifications.
 */
export async function requestPushPermission() {
  if (typeof window === 'undefined' || !window.Notification) {
    return 'unsupported'
  }

  if (window.OneSignal?.Notifications) {
    try {
      await window.OneSignal.Notifications.requestPermission()
      return window.Notification.permission
    } catch (err) {
      console.warn('[OneSignal Permission Error]', err)
    }
  }

  return await window.Notification.requestPermission()
}

/**
 * Checks current browser notification permission ('granted', 'denied', or 'default').
 */
export function getPermissionState() {
  if (typeof window === 'undefined' || !window.Notification) {
    return 'unsupported'
  }
  return window.Notification.permission
}

/**
 * Fetches OneSignal backend status from Express API.
 */
export async function getNotificationStatus() {
  try {
    const { data } = await axios.get('/api/notifications/status', authConfig())
    return data
  } catch {
    return { configured: false, appId: null }
  }
}

/**
 * Triggers an immediate test notification to the logged-in user's device.
 */
export async function sendTestNotification(customPayload = {}) {
  const { data } = await axios.post('/api/notifications/test', customPayload, authConfig())
  if (data.simulated && data.notification) {
    showLocalBrowserNotification(data.notification.title, data.notification.message)
  }
  return data
}

/**
 * Scans today's pending habits and sends an automated check-in reminder.
 */
export async function sendHabitReminder() {
  const { data } = await axios.post(
    '/api/notifications/remind-habits',
    { today: toDateKey(), todayWeekday: todayWeekdayShort() },
    authConfig()
  )
  if (data.simulated && data.notification) {
    showLocalBrowserNotification(data.notification.title, data.notification.message)
  }
  return data
}

/**
 * Triggers the urgent "Time is Running Out / Day Ending Soon" alert.
 */
export async function sendDayEndingNotification(habitNames = []) {
  const { hoursLeft, minutesLeft, timeText } = getTimeRemainingToday()
  try {
    const { data } = await axios.post(
      '/api/notifications/day-ending',
      {
        habitNames,
        today: toDateKey(),
        todayWeekday: todayWeekdayShort(),
        hoursLeft,
        minutesLeft,
      },
      authConfig()
    )
    if (data.simulated && data.notification) {
      showLocalBrowserNotification(data.notification.title, data.notification.message)
    }
    return data
  } catch {
    const count = habitNames.length
    const title =
      count > 0
        ? `⏳ Time is Running Out! (${timeText} left today)`
        : '🌙 Day Ending Soon — All Habits Complete!'
    const message =
      count > 0
        ? `The day is about to end and ${count} habit(s) are still unfinished: ${habitNames.slice(0, 3).join(', ')}. Log before midnight!`
        : 'Great job finishing all your habits before the day ends!'
    showLocalBrowserNotification(title, message)
    return {
      success: true,
      simulated: true,
      remainingCount: count,
      incompleteHabits: habitNames,
      hoursLeft,
      minutesLeft,
      notification: { title, message },
    }
  }
}

export const notificationService = {
  initOneSignal,
  requestPermission: requestPushPermission,
  isBrowserSubscribed() {
    return getPermissionState() === 'granted'
  },
  getDayEndingThresholdHours() {
    const saved = Number(localStorage.getItem(DAY_ENDING_THRESHOLD_KEY))
    return Number.isFinite(saved) && saved > 0 ? saved : 6
  },
  setDayEndingThresholdHours(hours) {
    localStorage.setItem(DAY_ENDING_THRESHOLD_KEY, String(hours))
  },
  showLocalBrowserNotification,
  getStatus: getNotificationStatus,
  sendTest: sendTestNotification,
  triggerHabitReminder: sendHabitReminder,
  triggerDayEndingReminder: sendDayEndingNotification,
  async checkAndNotifyDayEnding(habits = []) {
    const unfinished = getUnfinishedHabitsDueToday(habits)
    const { hoursLeft, minutesLeft, timeText } = getTimeRemainingToday()
    const threshold = this.getDayEndingThresholdHours()
    const isRunningOut = unfinished.length > 0 && hoursLeft < threshold

    const todayKey = toDateKey()
    if (isRunningOut && localStorage.getItem(DAY_ENDING_NOTIFIED_DATE_KEY) !== todayKey) {
      localStorage.setItem(DAY_ENDING_NOTIFIED_DATE_KEY, todayKey)
      await sendDayEndingNotification(unfinished.map((h) => h.name))
    }

    return {
      hasUnfinished: unfinished.length > 0,
      isRunningOut,
      unfinishedCount: unfinished.length,
      unfinishedNames: unfinished.map((h) => h.name),
      hoursLeft,
      minutesLeft,
      timeText,
      threshold,
    }
  },
}
