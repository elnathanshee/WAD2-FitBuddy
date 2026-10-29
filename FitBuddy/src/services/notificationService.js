// =============================================================================
// [IS216 Project Addition: OneSignal Frontend Notification Service]
// Technology: OneSignal Web SDK (v16) + Axios Backend API
//
// Manages device push registration, user external_id linking, permission prompts,
// and triggering habit reminders / test push alerts through the Express server.
// =============================================================================

import api from './api'
import { authService } from './authService'

let isInitialized = false
let currentConfig = null

/**
 * Ensures the OneSignal Web SDK is properly initialized.
 */
export async function initOneSignal() {
  if (isInitialized || typeof window === 'undefined') return

  try {
    // 1. Fetch server status to obtain public OneSignal App ID if not in client env
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

    // 2. Initialize using standard v16 deferred queue
    window.OneSignalDeferred = window.OneSignalDeferred || []
    window.OneSignalDeferred.push(async function (OneSignal) {
      await OneSignal.init({
        appId,
        allowLocalhostAsSecureOrigin: true, // Crucial for local dev & testing
        notifyButton: { enable: false }, // Using custom HabitBuddy UI
      })

      isInitialized = true

      // If user is already logged in, associate their ID with OneSignal
      const user = authService.getCurrentUser()
      if (user?.id) {
        await OneSignal.login(String(user.id))
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

  // 1. If OneSignal is ready, use OneSignal Notifications API
  if (window.OneSignal?.Notifications) {
    try {
      await window.OneSignal.Notifications.requestPermission()
      return window.Notification.permission
    } catch (err) {
      console.warn('[OneSignal Permission Error]', err)
    }
  }

  // 2. Standard browser fallback
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
    const { data } = await api.get('/notifications/status')
    return data
  } catch (err) {
    return { configured: false, appId: null }
  }
}

/**
 * Triggers an immediate test notification to the logged-in user's device.
 */
export async function sendTestNotification(customPayload = {}) {
  const { data } = await api.post('/notifications/test', customPayload)
  return data
}

/**
 * Scans today's pending habits and sends an automated check-in reminder.
 */
export async function sendHabitReminder() {
  const { data } = await api.post('/notifications/remind-habits')
  return data
}

