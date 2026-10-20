// =============================================================================
// [IS216 Project Addition: Challenge & Duels Service]
// =============================================================================

import api from './api'

export const challengeService = {
  async listChallenges() {
    const { data } = await api.get('/challenges')
    return data.challenges || []
  },

  async createChallenge(challengeData) {
    const { data } = await api.post('/challenges', challengeData)
    return data
  },

  async recordProgress(challengeId) {
    const { data } = await api.post(`/challenges/${challengeId}/progress`)
    return data
  },
}
