// =============================================================================
// [IS216 Project Addition: Analytics Service]
// =============================================================================

import api from './api'

export const analyticsService = {
  async getWeeklySummary() {
    const { data } = await api.get('/analytics/weekly-summary')
    return data
  },
}

