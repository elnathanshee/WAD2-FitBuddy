// =============================================================================
// [IS216 Project Addition: Leaderboard Service]
// Connects to /api/leaderboard on Express + Neon PostgreSQL
// =============================================================================

// Third-party library: Axios (https://axios-http.com) — used for HTTP calls to the Express API
import axios from 'axios'
import { authConfig } from './api'

export const leaderboardService = {
  async weekly(today) {
    const { data } = await axios.get('/api/leaderboard/weekly', authConfig({ params: { today } }))
    return data
  },

  async myScore(today) {
    const { data } = await axios.get('/api/leaderboard/me', authConfig({ params: { today } }))
    return data
  },

  async saveProfile({ displayName, avatarColor }) {
    const { data } = await axios.put('/api/leaderboard/profile', { displayName, avatarColor }, authConfig())
    return data
  },

  async sendCheer(recipientId, type = 'cheer', message = '') {
    const { data } = await axios.post('/api/leaderboard/cheer', { recipientId, type, message }, authConfig())
    return data
  },

  async getCheers() {
    const { data } = await axios.get('/api/leaderboard/cheers', authConfig())
    return data
  },
}
