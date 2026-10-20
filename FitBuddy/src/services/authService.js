// =============================================================================
// [IS216 Project Addition: Real Authentication Service]
// Technology: Axios + Express API + Neon PostgreSQL Auth
// =============================================================================

import api from './api'

export const authService = {
  /**
   * Real user login via Express & Neon PostgreSQL
   */
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password })
    const { user, token } = response.data
    localStorage.setItem('fitbuddy_token', token)
    localStorage.setItem('fitbuddy_user', JSON.stringify(user))
    return response.data
  },

  /**
   * Real user registration via Express & Neon PostgreSQL
   */
  async signup(userData) {
    const response = await api.post('/auth/signup', userData)
    const { user, token } = response.data
    localStorage.setItem('fitbuddy_token', token)
    localStorage.setItem('fitbuddy_user', JSON.stringify(user))
    return response.data
  },

  /**
   * Logs out the user and clears stored session tokens
   */
  logout() {
    localStorage.removeItem('fitbuddy_token')
    localStorage.removeItem('fitbuddy_user')
  },

  /**
   * Returns current user object from localStorage
   */
  getCurrentUser() {
    const userStr = localStorage.getItem('fitbuddy_user')
    try {
      return userStr ? JSON.parse(userStr) : null
    } catch {
      return null
    }
  },

  /**
   * Checks whether the user is logged in
   */
  isAuthenticated() {
    return Boolean(localStorage.getItem('fitbuddy_token'))
  },

  /**
   * Fetches the latest user profile from the backend
   */
  async fetchCurrentUser() {
    try {
      const response = await api.get('/auth/me')
      if (response.data?.user) {
        localStorage.setItem('fitbuddy_user', JSON.stringify(response.data.user))
        return response.data.user
      }
    } catch (err) {
      console.error('Failed to sync user profile:', err)
    }
    return this.getCurrentUser()
  },

  /**
   * Fetches the available demo accounts for 1-click test logins
   */
  async getDemoUsers() {
    const response = await api.get('/auth/demo-users')
    return response.data.demoAccounts || []
  },
}
