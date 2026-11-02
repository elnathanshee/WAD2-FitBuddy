<!--
  "Switch demo athlete" section of the account menu: one button per demo account.
  Clicking one logs in as that athlete (all demo accounts share a password) and
  reloads the page so every screen shows that athlete's data.
  Renders <li> items, so it must sit inside the menu's <ul>.
  Props: currentEmail (the logged-in user's email, to highlight the active athlete).
-->
<template>
  <li><h6 class="dropdown-header px-2">Switch demo athlete</h6></li>
  <li v-for="athlete in DEMO_ATHLETES" :key="athlete.email">
    <button
      class="dropdown-item d-flex align-items-center gap-2 small"
      :class="{ active: currentEmail === athlete.email }"
      @click="switchAthlete(athlete.email)"
    >
      <span class="rounded-circle d-inline-block" :style="{ width: '10px', height: '10px', backgroundColor: athlete.color }"></span>
      {{ athlete.name }}
    </button>
  </li>
</template>

<script setup>
import { useAuthStore } from '../../stores/auth'

defineProps({
  currentEmail: { type: String, default: '' },
})

const auth = useAuthStore()

const DEMO_ATHLETES = [
  { name: 'You (Demo)', email: 'demo@fitbuddy.com', color: '#4F46E5' },
  { name: 'Alex Tan', email: 'alex@fitbuddy.com', color: '#4CAF50' },
  { name: 'Bernice Lim', email: 'bernice@fitbuddy.com', color: '#FF9800' },
  { name: 'Charlie Wong', email: 'charlie@fitbuddy.com', color: '#9C27B0' },
  { name: 'David Lee', email: 'david@fitbuddy.com', color: '#2196F3' },
]

async function switchAthlete(email) {
  try {
    await auth.login(email, 'password123')
    window.location.reload()
  } catch (err) {
    console.error('Failed to switch athlete:', err)
  }
}
</script>
