// =============================================================================
// [IS216 Project Addition: Achievement Service]
// Connects to /api/achievements on Express + Neon PostgreSQL
// =============================================================================

import api from './api'

export const achievementService = {
  // Every badge, earned or not, plus the stats behind them.
  // `today` is the browser's local date, so the streak maths matches what the
  // user sees on the habits page.
  async list(today) {
    const { data } = await api.get('/achievements', { params: { today } })
    return data
  },
}
