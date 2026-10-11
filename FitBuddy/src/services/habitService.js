import api from './api'

// One function per /api/habits endpoint (see server/README.md).
// Each returns the response body; errors are thrown as axios errors —
// use errorMessage() to turn one into text for the user.
export const habitService = {
  async list(today) {
    const { data } = await api.get('/habits', { params: { today } })
    return data
  },

  async create(habit) {
    const { data } = await api.post('/habits', habit)
    return data
  },

  async update(id, changes) {
    const { data } = await api.put(`/habits/${id}`, changes)
    return data
  },

  async remove(id) {
    await api.delete(`/habits/${id}`)
  },

  // Adds `amount` to that day's total (e.g. 2.5 km)
  async logAmount(id, date, amount) {
    const { data } = await api.post(`/habits/${id}/checkins`, { date, count: amount })
    return data
  },

  // Replaces that day's total — used to fix a mistake. 0 clears the day.
  async setTotal(id, date, total) {
    const { data } = await api.put(`/habits/${id}/checkins/${date}`, { count: total })
    return data
  },

  async history(id, { from, to, today }) {
    const { data } = await api.get(`/habits/${id}/history`, { params: { from, to, today } })
    return data
  },
}

// The server sends { message } for every error; fall back to a generic one
// when the server couldn't be reached at all.
export function errorMessage(error) {
  return error?.response?.data?.message ?? 'Could not reach the server. Is the API running?'
}
