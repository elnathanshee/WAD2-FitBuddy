// =============================================================================
// [IS216 Project Addition: Analytics Service]
// =============================================================================

import api from './api'
import { toDateKey } from '../utils/dates'

export const analyticsService = {
  // period: 'day' | 'week' | 'month'; offset: 0 = current, -1 = previous, …
  async getSummary(period, offset = 0) {
    const { data } = await api.get('/analytics/summary', {
      params: { period, offset, today: toDateKey() },
    })
    return data
  },
}
