<template>
  <nav class="navbar navbar-expand-lg navbar-dark bg-dark sticky-top shadow-sm">
    <div class="container">
      <router-link class="navbar-brand d-flex align-items-center" to="/">
        <i class="bi bi-heart-pulse-fill text-primary fs-3 me-2"></i>
        <span class="fw-bold fs-4">FitBuddy</span>
      </router-link>
      
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
        <span class="navbar-toggler-icon"></span>
      </button>
      
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav ms-auto align-items-center gap-1">
          <template v-if="!isAuthenticated">
            <li class="nav-item">
              <router-link class="nav-link" to="/login">Login</router-link>
            </li>
            <li class="nav-item ms-lg-2">
              <router-link class="btn btn-primary px-3 rounded-pill" to="/signup">Sign Up</router-link>
            </li>
          </template>
          <template v-else>
            <li class="nav-item">
              <router-link class="nav-link" to="/dashboard">Dashboard</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/habits">
                <i class="bi bi-check2-square me-1"></i>Habits
              </router-link>
            </li>
            <li class="nav-item me-lg-2">
              <router-link class="nav-link" to="/leaderboard">
                <i class="bi bi-trophy me-1"></i>Leaderboard
              </router-link>
            </li>

            <!-- User Avatar & Identity Badge -->
            <li class="nav-item d-flex align-items-center me-2 text-light">
              <div
                class="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold me-2 flex-shrink-0"
                :style="{ width: '32px', height: '32px', backgroundColor: currentUser?.avatarColor || '#4F46E5', fontSize: '13px' }"
              >
                {{ (currentUser?.name || 'U').charAt(0).toUpperCase() }}
              </div>
              <span class="d-none d-lg-inline small fw-semibold">{{ currentUser?.name || 'Athlete' }}</span>
            </li>

            <!-- Switch Athlete Dropdown for Fast Multi-User Testing -->
            <li class="nav-item dropdown me-2">
              <button
                class="btn btn-sm btn-outline-secondary dropdown-toggle rounded-pill text-light py-1 px-2"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                style="font-size: 12px;"
              >
                <i class="bi bi-people me-1"></i>Switch
              </button>
              <ul class="dropdown-menu dropdown-menu-end shadow">
                <li><h6 class="dropdown-header">Switch Demo Athlete</h6></li>
                <li v-for="athlete in demoAthletes" :key="athlete.email">
                  <button
                    class="dropdown-item d-flex align-items-center gap-2 small"
                    :class="{ 'active': currentUser?.email === athlete.email }"
                    @click="switchAthlete(athlete.email)"
                  >
                    <span
                      class="rounded-circle d-inline-block"
                      :style="{ width: '10px', height: '10px', backgroundColor: athlete.color }"
                    ></span>
                    {{ athlete.name }}
                  </button>
                </li>
              </ul>
            </li>

            <li class="nav-item">
              <button @click="handleLogout" class="btn btn-sm btn-outline-light rounded-pill px-3 py-1">
                Logout
              </button>
            </li>
          </template>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { authService } from '../services/authService'

const router = useRouter()
const route = useRoute()

const demoAthletes = [
  { name: 'You (Demo)', email: 'demo@fitbuddy.com', color: '#4F46E5' },
  { name: 'Alex Tan', email: 'alex@fitbuddy.com', color: '#4CAF50' },
  { name: 'Bernice Lim', email: 'bernice@fitbuddy.com', color: '#FF9800' },
  { name: 'Charlie Wong', email: 'charlie@fitbuddy.com', color: '#9C27B0' },
  { name: 'David Lee', email: 'david@fitbuddy.com', color: '#2196F3' },
]

const isAuthenticated = computed(() => {
  route.path // Dependency to trigger re-evaluation on route change
  return authService.isAuthenticated()
})

const currentUser = computed(() => {
  route.path
  return authService.getCurrentUser()
})

const handleLogout = () => {
  authService.logout()
  router.push('/login')
}

const switchAthlete = async (email) => {
  try {
    await authService.login(email, 'password123')
    window.location.reload()
  } catch (err) {
    console.error('Failed to switch athlete:', err)
  }
}
</script>
