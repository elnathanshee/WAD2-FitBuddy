// =============================================================================
// [IS216 Project Addition: Fitness Tracker / Health Sync Service]
// =============================================================================

import api from './api'

export const healthSyncService = {
  async getTodayMetrics() {
    const { data } = await api.get('/health-sync/today')
    return data
  },
  async getGoogleStatus() {
    const { data } = await api.get('/health-sync/google/status')
    return data
  },
  async beginGoogleConnect() {
    const { data } = await api.get('/health-sync/google/connect')
    window.location.assign(data.url)
  },
  async syncGoogle(mappings = {}) {
    const { data } = await api.post('/health-sync/google/sync', { mappings })
    return data
  },
  async disconnectGoogle() {
    const { data } = await api.delete('/health-sync/google/connection')
    return data
  },
}

