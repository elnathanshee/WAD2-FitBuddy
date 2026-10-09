import axios from 'axios'
import { authService } from './authService'

// Shared axios instance for calling the Express API.
// In development, Vite proxies /api to http://localhost:3000 (see vite.config.js).
//
// Usage:  import api from '@/services/api'
//         const { data } = await api.get('/habits')
const api = axios.create({ baseURL: '/api' })

// Attach the logged-in user's id to every request. Temporary until real
// auth exists — then this becomes an "Authorization: Bearer <token>" header.
api.interceptors.request.use((config) => {
  const user = authService.getCurrentUser()
  if (user) {
    config.headers['x-user-id'] = String(user.id)
  }
  return config
})

export default api
