// =============================================================================
// [IS216 Project Addition: OneSignal API Configuration]
// Technology: OneSignal REST API (v1 / v2)
//
// OneSignal is used to send push notifications and habit reminders to users'
// devices. Provides configuration validation and fallback simulated modes.
// =============================================================================

import { cleanEnvVar } from './neon.js'

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

export function isOneSignalConfigured() {
  return getOneSignalConfig().isConfigured
}

