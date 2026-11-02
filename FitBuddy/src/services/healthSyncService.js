// =============================================================================
// [IS216 Project Addition: Fitness Tracker / Health Sync Service]
// =============================================================================

// Third-party library: Axios (https://axios-http.com) — used for HTTP calls to the Express API
import axios from 'axios'
import { authConfig } from './api'

export const healthSyncService = {
  async getTodayMetrics() {
    const { data } = await axios.get('/api/health-sync/today', authConfig())
    return data
  },
  async getGoogleStatus() {
    const { data } = await axios.get('/api/health-sync/google/status', authConfig())
    return data
  },
  async beginGoogleConnect() {
    const { data } = await axios.get('/api/health-sync/google/connect', authConfig())
    window.location.assign(data.url)
  },
  async syncGoogle(mappings = {}) {
    const { data } = await axios.post('/api/health-sync/google/sync', { mappings }, authConfig())
    return data
  },
  async disconnectGoogle() {
    const { data } = await axios.delete('/api/health-sync/google/connection', authConfig())
    return data
  },
}

