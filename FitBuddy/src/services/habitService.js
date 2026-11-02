// Third-party library: Axios (https://axios-http.com) — used for HTTP calls to the Express API
import axios from 'axios'
import { authConfig } from './api'

// One function per /api/habits endpoint (see server/README.md).
// Each returns the response body; errors are thrown as axios errors —
// use errorMessage() to turn one into text for the user.
export const habitService = {
  async list(today) {
    const { data } = await axios.get('/api/habits', authConfig({ params: { today } }))
    return data
  },

  async create(habit) {
    const { data } = await axios.post('/api/habits', habit, authConfig())
    return data
  },

  async update(id, changes) {
    const { data } = await axios.put(`/api/habits/${id}`, changes, authConfig())
    return data
  },

  async remove(id) {
    await axios.delete(`/api/habits/${id}`, authConfig())
  },

  // Adds `amount` to that day's total (e.g. 2.5 km)
  async logAmount(id, date, amount) {
    const { data } = await axios.post(`/api/habits/${id}/checkins`, { date, count: amount }, authConfig())
    return data
  },

  // Replaces that day's total — used to fix a mistake. 0 clears the day.
  async setTotal(id, date, total) {
    const { data } = await axios.put(`/api/habits/${id}/checkins/${date}`, { count: total }, authConfig())
    return data
  },

  async history(id, { from, to, today }) {
    const { data } = await axios.get(`/api/habits/${id}/history`, authConfig({ params: { from, to, today } }))
    return data
  },
}

// The server sends { message } for every error; fall back to a generic one
// when the server couldn't be reached at all.
export function errorMessage(error) {
  return error?.response?.data?.message ?? 'Could not reach the server. Is the API running?'
}
