// Reads the OneSignal keys from environment variables and says whether push notifications
// are really set up. Used by services/notificationService.js and notificationController.js.
// When the keys are missing or still the "your_..." placeholders, notifications are simulated.

import { cleanEnvVar } from './neon.js'

// Returns { appId, restApiKey, isConfigured, maskedApiKey } (the masked key is safe to show in a response).
export function getOneSignalConfig() {
  const appId = cleanEnvVar(process.env.ONESIGNAL_APP_ID, 'ONESIGNAL_APP_ID')
  const restApiKey = cleanEnvVar(process.env.ONESIGNAL_REST_API_KEY, 'ONESIGNAL_REST_API_KEY')

  const isConfigured = Boolean(appId && restApiKey && !appId.includes('your_') && !restApiKey.includes('your_'))

  return {
    appId,
    restApiKey,
    isConfigured,
    // Masked key for safe inspection / status responses
    maskedApiKey: restApiKey ? `${restApiKey.slice(0, 4)}...${restApiKey.slice(-4)}` : null,
  }
}

