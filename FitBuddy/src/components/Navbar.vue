<template>
  <nav class="navbar navbar-expand-lg navbar-dark bg-dark sticky-top">
    <div class="container">
      <router-link class="navbar-brand d-flex align-items-center" to="/">
        <i class="bi bi-activity text-primary fs-3 me-2"></i>
        <span class="fw-bold fs-4">FitBuddy</span>
      </router-link>
      
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
        <span class="navbar-toggler-icon"></span>
      </button>
      
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav ms-auto align-items-center">
          <li class="nav-item">
            <router-link class="nav-link" to="/leaderboard">
              <i class="bi bi-trophy me-1"></i>Leaderboard
            </router-link>
          </li>
          <template v-if="!isAuthenticated">
            <li class="nav-item">
              <router-link class="nav-link" to="/login">Login</router-link>
            </li>
            <li class="nav-item ms-lg-2">
              <router-link class="btn btn-primary px-3 rounded-pill" to="/signup">Sign Up</router-link>
            </li>
          </template>
          <template v-else>
            <li class="nav-item me-3 text-light d-none d-lg-block">
              Hi, {{ currentUser?.name || 'Athlete' }}
            </li>
            <li class="nav-item">
              <button @click="handleLogout" class="btn btn-outline-light rounded-pill px-3">
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
</script>

