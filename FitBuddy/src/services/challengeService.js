// =============================================================================
// [IS216 Project Addition: Challenge & Duels Service]
// =============================================================================

// Third-party library: Axios (https://axios-http.com) — used for HTTP calls to the Express API
import axios from 'axios'
import { authConfig } from './api'

export const challengeService = {
  async listChallenges() {
    const { data } = await axios.get('/api/challenges', authConfig())
    return data.challenges || []
  },

  async createChallenge(challengeData) {
    const { data } = await axios.post('/api/challenges', challengeData, authConfig())
    return data
  },

  async recordProgress(challengeId) {
    const { data } = await axios.post(`/api/challenges/${challengeId}/progress`, {}, authConfig())
    return data
  },

  // The invited friend answers a pending challenge
  async accept(challengeId) {
    const { data } = await axios.post(`/api/challenges/${challengeId}/accept`, {}, authConfig())
    return data
  },

  async decline(challengeId) {
    const { data } = await axios.post(`/api/challenges/${challengeId}/decline`, {}, authConfig())
    return data
  },

  // Creator cancels a pending challenge or dismisses a declined one
  async remove(challengeId) {
    const { data } = await axios.delete(`/api/challenges/${challengeId}`, authConfig())
    return data
  },
}
