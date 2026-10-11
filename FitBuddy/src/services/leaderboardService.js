import api from './api'

// One function per /api/leaderboard endpoint.
// `today` is the browser's local date key, so the week is the user's week —
// same convention habitService uses.
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
}
