<template>
  <div class="container mt-5 text-center">
    <div class="card p-5 shadow-sm border-0 rounded-4">
      <i class="bi bi-person-check-fill text-primary mb-3" style="font-size: 4rem;"></i>
      <h2 class="text-primary mb-4 fw-bold">Welcome to HabitBuddy! 🎉</h2>
      <p class="lead text-muted mb-4">Hello, <strong>{{ user?.name || 'Athlete' }}</strong>! Ready to crush your goals?</p>
      <div class="d-flex flex-wrap justify-content-center gap-2">
        <router-link to="/habits" class="btn btn-primary px-4 py-2 rounded-pill fw-semibold">
          <i class="bi bi-check2-square me-2"></i>Go to my habits
        </router-link>
        <button @click="handleLogout" class="btn btn-outline-danger px-4 py-2 rounded-pill fw-semibold">
          <i class="bi bi-box-arrow-right me-2"></i>Logout
        </button>
      </div>
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

