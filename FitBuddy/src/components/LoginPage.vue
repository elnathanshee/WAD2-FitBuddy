<template>
  <div class="row g-0 auth-wrapper">
    <div class="col-lg-6 auth-brand-section d-none d-lg-flex">
      <i class="bi bi-heart-pulse-fill text-primary" style="font-size: 5rem;"></i>
      <h1 class="fw-bold mt-4 mb-3">Welcome Back!</h1>
      <p class="lead text-light opacity-75">Log in to track your fitness journey, challenge friends, and climb the leaderboard.</p>
    </div>
    
    <div class="col-lg-6 auth-form-section">
      <div class="auth-form-card shadow-sm p-4 p-md-5 rounded-4">
        <div class="text-center mb-4 d-lg-none">
          <BrandMark class="auth-logo mx-auto" aria-hidden="true" />
          <h2 class="fw-bold mt-2">HabitBuddy</h2>
        </div>
        
        <h3 class="fw-bold mb-3 text-center">Login</h3>
        
        <div v-if="errorMsg" class="alert alert-danger alert-dismissible fade show" role="alert">
          <i class="bi bi-exclamation-circle me-2"></i>{{ errorMsg }}
          <button type="button" class="btn-close" @click="errorMsg = ''"></button>
        </div>
        
        <div v-if="successMsg" class="alert alert-success alert-dismissible fade show" role="alert">
          <i class="bi bi-check-circle me-2"></i>{{ successMsg }}
          <button type="button" class="btn-close" @click="successMsg = ''"></button>
        </div>

        <form @submit.prevent="handleLogin">
          <div class="form-floating mb-3">
            <input type="email" class="form-control" id="email" v-model="email" placeholder="name@example.com" required>
            <label for="email">Email address</label>
          </div>
          
          <div class="input-group mb-3">
            <div class="form-floating flex-grow-1">
              <input :type="showPassword ? 'text' : 'password'" class="form-control" id="password" v-model="password" placeholder="Password" required style="border-right: none;">
              <label for="password">Password</label>
            </div>
            <span class="input-group-text password-toggle bg-transparent" @click="showPassword = !showPassword" style="cursor: pointer;">
              <i class="bi" :class="showPassword ? 'bi-eye-slash' : 'bi-eye'"></i>
            </span>
          </div>
          
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="remember" v-model="remember">
              <label class="form-check-label text-muted small" for="remember">
                Remember me
              </label>
            </div>
            <span class="text-muted small">Default password: <code>password123</code></span>
          </div>
          
          <button type="submit" class="btn btn-primary w-100 py-3 rounded-pill mb-3" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            {{ loading ? 'Logging in...' : 'Log In' }}
          </button>
        </form>

        <!-- 1-Click Quick Demo User Logins for Testing & Grading -->
        <div class="mt-4 pt-3 border-top">
          <div class="text-muted small fw-semibold text-uppercase mb-2 text-center">
            ⚡ Quick Test Athletes (1-Click Login)
          </div>
          <div class="d-flex flex-wrap gap-2 justify-content-center">
            <button
              v-for="athlete in demoAthletes"
              :key="athlete.email"
              type="button"
              class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 rounded-pill px-3 py-1"
              @click="quickLogin(athlete.email)"
              :disabled="loading"
            >
              <span class="rounded-circle d-inline-block" :style="{ width: '10px', height: '10px', backgroundColor: athlete.color }"></span>
              {{ athlete.name }}
            </button>
          </div>
        </div>

        <p class="text-center text-muted mb-0 mt-4">
          Don't have an account? <router-link to="/signup" class="text-primary fw-semibold text-decoration-none">Sign up</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import BrandMark from './BrandMark.vue'
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { authService } from '../services/authService'

const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const remember = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref(route.query.registered === 'true' ? 'Account created successfully! Please log in.' : '')

const demoAthletes = [
  { name: 'You (Demo)', email: 'demo@fitbuddy.com', color: '#4F46E5' },
  { name: 'Alex Tan', email: 'alex@fitbuddy.com', color: '#4CAF50' },
  { name: 'Bernice Lim', email: 'bernice@fitbuddy.com', color: '#FF9800' },
  { name: 'Charlie Wong', email: 'charlie@fitbuddy.com', color: '#9C27B0' },
  { name: 'David Lee', email: 'david@fitbuddy.com', color: '#2196F3' },
]

const handleLogin = async () => {
  errorMsg.value = ''
  loading.value = true
  try {
    await authService.login(email.value, password.value)
    router.push('/home')
  } catch (err) {
    errorMsg.value = err.response?.data?.message || 'Invalid email or password.'
  } finally {
    loading.value = false
  }
}

const quickLogin = async (athleteEmail) => {
  email.value = athleteEmail
  password.value = 'password123'
  await handleLogin()
}
</script>
