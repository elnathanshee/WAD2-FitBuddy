import axios from 'axios'
import { authService } from './authService'

// Shared axios instance for calling the Express API.
// In development, Vite proxies /api to http://localhost:3000 (see vite.config.js).
const api = axios.create({ baseURL: '/api' })

// Attach the logged-in user's Bearer token and ID to every outgoing request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fitbuddy_token')
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  const user = authService.getCurrentUser()
  if (user?.id) {
    config.headers['x-user-id'] = String(user.id)
  }
  return config
})

export default api
