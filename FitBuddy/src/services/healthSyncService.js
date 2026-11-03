// Client for /api/health-sync: simulated Google Health wearable activity data
// and automatic habit check-in sync.
// Third-party library: Axios (https://axios-http.com) — used for HTTP calls to the Express API
import axios from 'axios'
import { authConfig } from './api'

const BASE = '/api/health-sync'

export const healthSyncService = {
  async getStatus() {
    const { data } = await axios.get(`${BASE}/google/status`, authConfig())
    return data
  },
  async getTodayMetrics() {
    const { data } = await axios.get(`${BASE}/today`, authConfig())
    return data
  },
  async connectGoogle() {
    const { data } = await axios.post(`${BASE}/google/connect`, {}, authConfig())
    return data
  },
  async syncGoogle(payload = {}) {
    const { data } = await axios.post(`${BASE}/google/sync`, payload, authConfig())
    return data
  },
  async disconnectGoogle() {
    const { data } = await axios.delete(`${BASE}/google/connection`, authConfig())
    return data
  },
}
