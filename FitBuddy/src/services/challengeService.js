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

  async accept(challengeId) {
    const { data } = await api.post(`/challenges/${challengeId}/accept`)
    return data
  },

  async decline(challengeId) {
    const { data } = await api.post(`/challenges/${challengeId}/decline`)
    return data
  },

  // Creator cancels a pending challenge or dismisses a declined one
  async remove(challengeId) {
    const { data } = await api.delete(`/challenges/${challengeId}`)
    return data
  },
}
