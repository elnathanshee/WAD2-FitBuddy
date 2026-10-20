<template>
  <div class="container py-4 py-md-5">
    <!-- Welcome Header -->
    <div class="card p-4 p-md-5 shadow-sm border-0 rounded-4 text-center mb-4 bg-primary text-white">
      <i class="bi bi-activity fs-1 mb-2"></i>
      <h1 class="h2 fw-bold mb-2">Welcome to FitBuddy, {{ user?.name || 'Athlete' }}! 🎉</h1>
      <p class="lead opacity-90 mb-0">Track habits, achieve your health goals with Gemini AI, and climb the leaderboard.</p>
    </div>

    <!-- Quick Action Cards Grid -->
    <div class="row g-4 mb-4">
      <!-- Card 1: Habits -->
      <div class="col-12 col-md-4">
        <div class="card h-100 border-0 shadow-sm rounded-4 p-4 text-center hover-card">
          <div class="feature-icon bg-primary-subtle text-primary rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 64px; height: 64px;">
            <i class="bi bi-check2-circle fs-2"></i>
          </div>
          <h2 class="h5 fw-bold mb-2">My Daily Habits</h2>
          <p class="text-muted small mb-4 flex-grow-1">Check in on your daily and weekly habits, log progress, and build streaks.</p>
          <router-link to="/habits" class="btn btn-primary rounded-pill px-4 fw-semibold">
            <i class="bi bi-arrow-right-circle me-1"></i>Open Habits
          </router-link>
        </div>
      </div>

      <!-- Card 2: AI Goal Coach -->
      <div class="col-12 col-md-4">
        <div class="card h-100 border-0 shadow-sm rounded-4 p-4 text-center hover-card border-primary-subtle">
          <div class="feature-icon bg-warning-subtle text-warning rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 64px; height: 64px;">
            <i class="bi bi-stars fs-2"></i>
          </div>
          <h2 class="h5 fw-bold mb-2">AI Goal Coach</h2>
          <p class="text-muted small mb-4 flex-grow-1">Tell Gemini about your lifestyle and get tailored habits matching your goals.</p>
          <router-link to="/habits" class="btn btn-outline-primary rounded-pill px-4 fw-semibold">
            <i class="bi bi-stars me-1"></i>Consult AI Coach
          </router-link>
        </div>
      </div>

      <!-- Card 3: Leaderboard -->
      <div class="col-12 col-md-4">
        <div class="card h-100 border-0 shadow-sm rounded-4 p-4 text-center hover-card">
          <div class="feature-icon bg-success-subtle text-success rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 64px; height: 64px;">
            <i class="bi bi-trophy fs-2"></i>
          </div>
          <h2 class="h5 fw-bold mb-2">Weekly Leaderboard</h2>
          <p class="text-muted small mb-4 flex-grow-1">Compete with friends, earn milestone streak points, and climb the ranks.</p>
          <router-link to="/leaderboard" class="btn btn-outline-success rounded-pill px-4 fw-semibold">
            <i class="bi bi-trophy me-1"></i>View Leaderboard
          </router-link>
        </div>
      </div>
    </div>

    <!-- User Account & Logout Footer -->
    <div class="text-center pt-2">
      <button @click="handleLogout" class="btn btn-outline-danger px-4 py-2 rounded-pill fw-semibold">
        <i class="bi bi-box-arrow-right me-2"></i>Logout
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '../services/authService'

const router = useRouter()
const user = ref(authService.getCurrentUser())

const handleLogout = () => {
  authService.logout()
  router.push('/login')
}
</script>

<style scoped>
.hover-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hover-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.08) !important;
}
</style>
