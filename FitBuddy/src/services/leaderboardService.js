// =============================================================================
// [IS216 Project Addition: Leaderboard Service]
// Connects to /api/leaderboard on Express + Neon PostgreSQL
// =============================================================================

import api from './api'

export const leaderboardService = {
  async weekly(today) {
    const { data } = await api.get('/leaderboard/weekly', { params: { today } })
    return data
  },

  async myScore(today) {
    const { data } = await api.get('/leaderboard/me', { params: { today } })
    return data
  },

  async saveProfile({ displayName, avatarColor }) {
    const { data } = await api.put('/leaderboard/profile', { displayName, avatarColor })
    return data
  },

  async sendCheer(recipientId, type = 'cheer', message = '') {
    const { data } = await api.post('/leaderboard/cheer', { recipientId, type, message })
    return data
  },

  async getCheers() {
    const { data } = await api.get('/leaderboard/cheers')
    return data
  },
}
