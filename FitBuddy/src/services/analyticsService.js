// =============================================================================
// [IS216 Project Addition: Analytics Service]
// =============================================================================

// Third-party library: Axios (https://axios-http.com) — used for HTTP calls to the Express API
import axios from 'axios'
import { authConfig } from './api'
import { toDateKey } from '../utils/dates'

export const analyticsService = {
  // period: 'day' | 'week' | 'month'; offset: 0 = current, -1 = previous, …
  async getSummary(period, offset = 0) {
    const { data } = await axios.get('/api/analytics/summary', authConfig({ params: { period, offset, today: toDateKey() } }))
    return data
  },
}
