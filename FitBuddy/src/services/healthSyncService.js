// Client for /api/health-sync: simulated Google Health wearable activity data
// and automatic habit check-in sync.
// Third-party library: Axios (https://axios-http.com) — used for HTTP calls to the Express API
import axios from 'axios'
import { authConfig } from './api'
import { toDateKey } from '../utils/dates'

const BASE = '/api/health-sync'

export const healthSyncService = {
  async getStatus() {
    const { data } = await axios.get(
      `${BASE}/google/status`,
      authConfig({ params: { today: toDateKey() } })
    )
    return data
  },
  async getTodayMetrics() {
    const { data } = await axios.get(
      `${BASE}/today`,
      authConfig({ params: { today: toDateKey() } })
    )
    return data
  },
  async connectGoogle() {
    const { data } = await axios.post(
      `${BASE}/google/connect`,
      { today: toDateKey() },
      authConfig()
    )
    return data
  },
  async syncGoogle(payload = {}) {
    const { data } = await axios.post(
      `${BASE}/google/sync`,
      { ...payload, today: toDateKey() },
      authConfig()
    )
    return data
  },
  async disconnectGoogle() {
    const { data } = await axios.delete(`${BASE}/google/connection`, authConfig())
    return data
  },
}
