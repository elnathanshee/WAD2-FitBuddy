// Builds the Axios request config that sends the logged-in user's token and id.
// Every service passes authConfig() as the last argument, e.g.
//   axios.get('/api/habits', authConfig({ params: { today } }))
// In development, Vite proxies /api to http://localhost:3000 (see vite.config.js).
import { useAuthStore } from '../stores/auth'

export function authConfig(extra = {}) {
  const auth = useAuthStore()
  const headers = {}
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`
  if (auth.user?.id) headers['x-user-id'] = String(auth.user.id)
  return { headers, ...extra }
}
