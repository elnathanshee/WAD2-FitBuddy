<template>
  <div class="container py-4 py-md-5" style="max-width: 1040px;">
    <!-- Welcome Header -->
    <div class="card p-4 p-md-5 shadow-sm border-0 rounded-4 text-center mb-4 bg-primary text-white position-relative overflow-hidden">
      <div class="position-relative z-1">
        <div
          class="rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
          :style="{ width: '56px', height: '56px', backgroundColor: user?.avatarColor || '#3B82F6', fontSize: '24px' }"
        >
          {{ (user?.name || 'A').charAt(0).toUpperCase() }}
        </div>
        <h1 class="h2 fw-bold mb-2">Welcome back, {{ user?.name || 'Athlete' }}! 🎉</h1>
        <p class="lead opacity-90 mb-0" style="font-size: 1.1rem;">
          Track daily habits, challenge rival buddies, sync health telemetry, and consult your Gemini AI Coach.
        </p>
      </div>
    </div>

    <!-- 1. Fitness Tracker & Wearable Health Sync Widget -->
    <FitnessTrackerWidget @synced="refreshDashboard" />

    <!-- 2. 7-Day Consistency & Progress Analytics Matrix -->
    <ConsistencyMatrixWidget ref="consistencyRef" />

    <!-- 3. Friend Challenges & Duels Section -->
    <ChallengesSection ref="challengesRef" />

    <!-- Quick Action Navigation Cards -->
    <div class="row g-4 mb-4">
      <!-- Card 1: Habits -->
      <div class="col-12 col-md-4">
        <div class="card h-100 border-0 shadow-sm rounded-4 p-4 text-center hover-card">
          <div class="feature-icon bg-primary-subtle text-primary rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 56px; height: 56px;">
            <i class="bi bi-check2-circle fs-3"></i>
          </div>
          <h2 class="h5 fw-bold mb-2">My Daily Habits</h2>
          <p class="text-muted small mb-4 flex-grow-1">Check in on your habits, log progress counts, and build uninterrupted streaks.</p>
          <router-link to="/habits" class="btn btn-primary rounded-pill px-4 fw-semibold">
            <i class="bi bi-arrow-right-circle me-1"></i>Open Habits
          </router-link>
        </div>
      </div>

      <!-- Card 2: AI Goal Coach -->
      <div class="col-12 col-md-4">
        <div class="card h-100 border-0 shadow-sm rounded-4 p-4 text-center hover-card border-primary-subtle">
          <div class="feature-icon bg-warning-subtle text-warning rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 56px; height: 56px;">
            <i class="bi bi-stars fs-3"></i>
          </div>
          <h2 class="h5 fw-bold mb-2">Gemini AI Coach</h2>
          <p class="text-muted small mb-4 flex-grow-1">Get custom habits tailored to your schedule, lifestyle, and fitness ambitions.</p>
          <router-link to="/habits" class="btn btn-outline-primary rounded-pill px-4 fw-semibold">
            <i class="bi bi-stars me-1"></i>Consult AI Coach
          </router-link>
        </div>
      </div>

      <!-- Card 3: Leaderboard -->
      <div class="col-12 col-md-4">
        <div class="card h-100 border-0 shadow-sm rounded-4 p-4 text-center hover-card">
          <div class="feature-icon bg-success-subtle text-success rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 56px; height: 56px;">
            <i class="bi bi-trophy fs-3"></i>
          </div>
          <h2 class="h5 fw-bold mb-2">Weekly Leaderboard</h2>
          <p class="text-muted small mb-4 flex-grow-1">Compete with friends, send cheers and nudges, and climb the weekly podium.</p>
          <router-link to="/leaderboard" class="btn btn-outline-success rounded-pill px-4 fw-semibold">
            <i class="bi bi-trophy me-1"></i>View Leaderboard
          </router-link>
        </div>
      </div>
    </div>

    <!-- User Account & Logout Footer -->
    <div class="text-center pt-2 pb-4">
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
import FitnessTrackerWidget from '../components/dashboard/FitnessTrackerWidget.vue'
import ConsistencyMatrixWidget from '../components/dashboard/ConsistencyMatrixWidget.vue'
import ChallengesSection from '../components/dashboard/ChallengesSection.vue'

const router = useRouter()
const user = ref(authService.getCurrentUser())
const consistencyRef = ref(null)
const challengesRef = ref(null)

const handleLogout = () => {
  authService.logout()
  router.push('/login')
}

const refreshDashboard = () => {
  consistencyRef.value?.loadAnalytics?.()
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
