// =============================================================================
// [IS216 Project Addition: Friend Service]
// Connects to /api/friends on Express + Neon PostgreSQL
// =============================================================================

import api from './api'

export const friendService = {
  async list() {
    const { data } = await api.get('/friends')
    return data
  },

  async search(q) {
    const { data } = await api.get('/friends/search', { params: { q } })
    return data
  },

  async sendRequest(userId) {
    const { data } = await api.post('/friends/requests', { userId })
    return data
  },

  async accept(requestId) {
    const { data } = await api.post(`/friends/requests/${requestId}/accept`)
    return data
  },

  async reject(requestId) {
    const { data } = await api.post(`/friends/requests/${requestId}/reject`)
    return data
  },

  async cancel(requestId) {
    const { data } = await api.delete(`/friends/requests/${requestId}`)
    return data
  },

  async remove(userId) {
    const { data } = await api.delete(`/friends/${userId}`)
    return data
  },

  async profile(userId, today) {
    const { data } = await api.get(`/friends/${userId}/profile`, { params: { today } })
    return data
  },
}
