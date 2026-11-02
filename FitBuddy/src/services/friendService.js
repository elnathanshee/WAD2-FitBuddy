// =============================================================================
// [IS216 Project Addition: Friend Service]
// Connects to /api/friends on Express + Neon PostgreSQL
// =============================================================================

// Third-party library: Axios (https://axios-http.com) — used for HTTP calls to the Express API
import axios from 'axios'
import { authConfig } from './api'

export const friendService = {
  async list() {
    const { data } = await axios.get('/api/friends', authConfig())
    return data
  },

  async search(q) {
    const { data } = await axios.get('/api/friends/search', authConfig({ params: { q } }))
    return data
  },

  async sendRequest(userId) {
    const { data } = await axios.post('/api/friends/requests', { userId }, authConfig())
    return data
  },

  async accept(requestId) {
    const { data } = await axios.post(`/api/friends/requests/${requestId}/accept`, {}, authConfig())
    return data
  },

  async reject(requestId) {
    const { data } = await axios.post(`/api/friends/requests/${requestId}/reject`, {}, authConfig())
    return data
  },

  async cancel(requestId) {
    const { data } = await axios.delete(`/api/friends/requests/${requestId}`, authConfig())
    return data
  },

  async remove(userId) {
    const { data } = await axios.delete(`/api/friends/${userId}`, authConfig())
    return data
  },

  async profile(userId, today) {
    const { data } = await axios.get(`/api/friends/${userId}/profile`, authConfig({ params: { today } }))
    return data
  },
}
