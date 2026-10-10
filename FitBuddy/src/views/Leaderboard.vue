<template>
  <div class="container py-4" style="max-width: 760px;">

    <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-1">
      <div>
        <h2 class="fw-bold text-primary mb-0">Weekly Leaderboard</h2>
        <p class="text-muted mb-0" v-if="board">
          Week of {{ formatDate(board.weekStart) }} – {{ formatDate(board.weekEnd) }}
          <span class="badge bg-light text-secondary ms-1">resets Monday</span>
        </p>
      </div>
      <button class="btn btn-sm btn-outline-secondary rounded-pill" @click="refreshAll" :disabled="loading">
        <i class="bi bi-arrow-clockwise me-1"></i>Refresh
      </button>
    </div>

    <!-- Temporary user switcher: stands in for login so the demo can show the
         board from different players' perspectives. -->
    <div class="card border-0 shadow-sm rounded-4 my-3">
      <div class="card-body py-3">
        <label class="form-label small fw-semibold text-muted mb-1">
          <i class="bi bi-person-badge me-1"></i>Demo user (stands in for login)
        </label>
        <select class="form-select" v-model="currentUserId" @change="onUserChange">
          <option disabled value="">Choose a user…</option>
          <option v-for="u in users" :key="u.id" :value="u.id">{{ u.displayName }}</option>
        </select>
      </div>
    </div>

    <div v-if="error" class="alert alert-danger d-flex align-items-center" role="alert">
      <i class="bi bi-exclamation-triangle me-2"></i>{{ error }}
    </div>

    <div v-if="toast" class="alert alert-success d-flex align-items-center" role="alert">
      <i class="bi bi-stars me-2"></i>{{ toast }}
    </div>

    <!-- Today's habits: checking one in is what feeds the leaderboard -->
    <div v-if="currentUserId" class="card border-0 shadow-sm rounded-4 mb-3">
      <div class="card-body">
        <h5 class="fw-bold mb-3">Today's habits</h5>

        <p v-if="!loading && habits.length === 0" class="text-muted mb-0">
          No habits yet for this user. Run <code>npm run seed</code> in the server folder.
        </p>

        <div
          v-for="habit in habits"
          :key="habit.id"
          class="d-flex justify-content-between align-items-center py-2 border-bottom"
        >
          <div>
            <div class="fw-semibold">{{ habit.name }}</div>
            <small class="text-muted">
              <span v-if="habit.currentStreak > 0">🔥 {{ habit.currentStreak }}-day streak</span>
              <span v-else>No active streak</span>
              <span class="ms-2">· best {{ habit.longestStreak }}</span>
            </small>
          </div>
          <button
            class="btn rounded-circle d-flex align-items-center justify-content-center"
            :class="habit.completedToday ? 'btn-success' : 'btn-outline-primary'"
            style="width: 44px; height: 44px;"
            :disabled="habit.completedToday || checkingId === habit.id"
            @click="onCheckIn(habit)"
          >
            <span v-if="checkingId === habit.id" class="spinner-border spinner-border-sm"></span>
            <i v-else :class="habit.completedToday ? 'bi bi-check-lg' : 'bi bi-plus-lg'"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- The leaderboard itself -->
    <div class="card border-0 shadow-sm rounded-4">
      <div class="card-body">
        <div v-if="loading && !board" class="text-center py-4">
          <div class="spinner-border text-primary"></div>
        </div>

        <div
          v-for="row in board?.rows || []"
          :key="row.userId"
          class="d-flex align-items-center justify-content-between p-2 rounded-3 mb-1"
          :class="{ 'bg-primary bg-opacity-10': row.isCurrentUser }"
        >
          <div class="d-flex align-items-center gap-3">
            <span class="fw-bold text-muted" style="width: 28px; text-align: center;">
              <span v-if="row.rank === 1">🥇</span>
              <span v-else-if="row.rank === 2">🥈</span>
              <span v-else-if="row.rank === 3">🥉</span>
              <span v-else>{{ row.rank }}</span>
            </span>
            <div
              class="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
              :style="{ width: '38px', height: '38px', background: row.avatarColor }"
            >
              {{ row.displayName.charAt(0) }}
            </div>
            <div>
              <div class="fw-semibold">
                {{ row.displayName }}
                <span v-if="row.isCurrentUser" class="badge bg-primary ms-1">You</span>
              </div>
              <small class="text-muted">{{ row.awardCount }} awards this week</small>
            </div>
          </div>
          <div class="fw-bold fs-5 text-primary">{{ row.weeklyPoints }}</div>
        </div>

        <p v-if="board && board.rows.length === 0" class="text-muted text-center mb-0 py-3">
          No users yet — seed the database to get started.
        </p>
      </div>
    </div>

    <p class="text-muted small mt-3 mb-0">
      Points: +10 per check-in · +20 for completing every habit in a day · +30 each time a habit hits a 7-day streak.
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { gamificationService } from '../services/gamificationService'

const users = ref([])
const habits = ref([])
const board = ref(null)
const currentUserId = ref(localStorage.getItem('fitbuddy_demo_user_id') || '')
const loading = ref(false)
const error = ref('')
const toast = ref('')
const checkingId = ref(null)

function formatDate(d) {
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function showToast(message) {
  toast.value = message
  setTimeout(() => { toast.value = '' }, 4000)
}

async function refreshAll() {
  loading.value = true
  error.value = ''
  try {
    board.value = await gamificationService.weeklyLeaderboard()
    habits.value = currentUserId.value ? await gamificationService.listHabits() : []
  } catch (err) {
    error.value = err.message || 'Could not load the leaderboard.'
  } finally {
    loading.value = false
  }
}

function onUserChange() {
  localStorage.setItem('fitbuddy_demo_user_id', currentUserId.value)
  refreshAll()
}

async function onCheckIn(habit) {
  checkingId.value = habit.id
  error.value = ''
  try {
    const result = await gamificationService.checkIn(habit.id)
    const detail = result.awards
      .map((a) => ({ CHECKIN: 'check-in', ALL_DAILY_BONUS: 'all habits done!', STREAK_BONUS: '7-day streak!' }[a.reason]))
      .join(' + ')
    showToast(`+${result.totalAwarded} points (${detail})`)
    await refreshAll()
  } catch (err) {
    error.value = err.message || 'Could not save that check-in.'
  } finally {
    checkingId.value = null
  }
}

onMounted(async () => {
  try {
    users.value = await gamificationService.listUsers()
  } catch (err) {
    error.value = err.message || 'Could not reach the backend.'
  }
  await refreshAll()
})
</script>
