// =============================================================================
// [IS216 Project Addition: Achievement Service]
// Connects to /api/achievements on Express + Neon PostgreSQL
// =============================================================================

// Third-party library: Axios (https://axios-http.com) — used for HTTP calls to the Express API
import axios from 'axios'
import { authConfig } from './api'

export const achievementService = {
  // Every badge, earned or not, plus the stats behind them.
  // `today` is the browser's local date, so the streak maths matches what the
  // user sees on the habits page.
  async list(today) {
    const { data } = await axios.get('/api/achievements', authConfig({ params: { today } }))
    return data
  },
}
