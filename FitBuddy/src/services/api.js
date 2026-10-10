import axios from 'axios'

/**
 * Shared axios instance for all backend calls.
 *
 * The x-user-id header is a temporary stand-in for authentication: until the
 * auth work is merged, the app identifies the current user this way. When real
 * login lands, this interceptor swaps the header for the JWT and nothing else
 * in the app has to change.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  const demoUserId = localStorage.getItem('fitbuddy_demo_user_id')
  if (demoUserId) config.headers['x-user-id'] = demoUserId
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (!err.response) {
      return Promise.reject({ message: 'Cannot reach the server. Is the backend running on port 4000?' })
    }
    return Promise.reject(err.response.data || { message: 'Something went wrong.' })
  },
)

export default api
