// Auth store: who is logged in (user + token) and the actions that change it.
// Used by the router guard, Login/Signup pages, Navbar, the profile modal, the
// API helper (services/api.js) and any page that needs the current user's id.
// The user and token are also kept in localStorage so a refresh stays logged in.
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
// Third-party library: Axios (https://axios-http.com) — used for HTTP calls to the Express API
import axios from 'axios'
import { authConfig } from '../services/api'
import { loginToOneSignal, logoutFromOneSignal } from '../services/notificationService'

function loadSavedUser() {
  try {
    const saved = localStorage.getItem('fitbuddy_user')
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref(loadSavedUser())
  const token = ref(localStorage.getItem('fitbuddy_token'))

  const isLoggedIn = computed(() => Boolean(token.value))

  // Save the session in the store and in localStorage
  function saveSession(newUser, newToken) {
    user.value = newUser
    token.value = newToken
    localStorage.setItem('fitbuddy_token', newToken)
    localStorage.setItem('fitbuddy_user', JSON.stringify(newUser))
    if (newUser?.id) loginToOneSignal(newUser.id)
  }

  // Save just the user (used after the profile changes)
  function saveUser(newUser) {
    user.value = newUser
    localStorage.setItem('fitbuddy_user', JSON.stringify(newUser))
  }

  async function login(email, password) {
    const response = await axios.post('/api/auth/login', { email, password })
    saveSession(response.data.user, response.data.token)
    return response.data
  }

  async function signup(userData) {
    const response = await axios.post('/api/auth/signup', userData)
    saveSession(response.data.user, response.data.token)
    return response.data
  }

  function logout() {
    logoutFromOneSignal()
    user.value = null
    token.value = null
    localStorage.removeItem('fitbuddy_token')
    localStorage.removeItem('fitbuddy_user')
  }

  // Refresh the saved user from the server; if that fails, keep the saved one
  async function fetchCurrentUser() {
    try {
      const response = await axios.get('/api/auth/me', authConfig())
      if (response.data?.user) {
        saveUser(response.data.user)
        return response.data.user
      }
    } catch (err) {
      console.error('Failed to sync user profile:', err)
    }
    return user.value
  }

  // Update the display name and avatar colour; the navbar updates on its own
  async function updateProfile(name, avatarColor) {
    const response = await axios.put('/api/auth/profile', { name, avatarColor }, authConfig())
    saveUser(response.data.user)
    return response.data.user
  }

  return { user, token, isLoggedIn, login, signup, logout, fetchCurrentUser, updateProfile }
})
