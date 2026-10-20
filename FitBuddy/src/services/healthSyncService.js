// =============================================================================
// [IS216 Project Addition: Fitness Tracker / Health Sync Service]
// =============================================================================

import api from './api'

export const healthSyncService = {
  async getTodayMetrics() {
    const { data } = await api.get('/health-sync/today')
    return data.metrics
  },

  async simulateSync(payload = {}) {
    const { data } = await api.post('/health-sync/simulate', payload)
    return data
  },
}

