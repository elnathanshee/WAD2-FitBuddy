<template>
  <div class="container py-4" style="max-width: 820px;">

    <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-1">
      <div>
        <h2 class="fw-bold mb-0">Weekly leaderboard</h2>
        <p class="text-muted mb-0">{{ weekLabel }}</p>
      </div>
      <button class="btn btn-sm btn-outline-secondary" @click="load" :disabled="loading">
        <i class="bi bi-arrow-clockwise me-1"></i>Refresh
      </button>
    </div>

    <div v-if="error" class="alert alert-danger d-flex align-items-center mt-3" role="alert">
      <i class="bi bi-exclamation-triangle me-2"></i>{{ error }}
    </div>

    <!-- Your score, broken down, so the number is explainable -->
    <div v-if="me" class="card border-0 shadow-sm rounded-4 my-3">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <div class="text-muted small text-uppercase fw-semibold">Your points this week</div>
            <div class="display-6 fw-bold">{{ me.total }}</div>
          </div>
          <ul class="list-unstyled mb-0 small text-muted">
            <li><strong>{{ me.completions }}</strong> × {{ me.rules.COMPLETION }} — habits completed</li>
            <li><strong>{{ me.allDailyDays }}</strong> × {{ me.rules.ALL_DAILY }} — days you finished everything</li>
            <li><strong>{{ me.milestones }}</strong> × {{ me.rules.STREAK_MILESTONE }} — 7-day streak milestones</li>
          </ul>
        </div>
      </div>
    </div>

    <div v-if="loading && !board" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <div v-else-if="board" class="card border-0 shadow-sm rounded-4">
      <div class="card-body">

        <p v-if="board.entries.length === 0" class="text-muted text-center mb-0 py-4">
          Nobody has any habits yet. Add one and check in to get on the board.
        </p>

        <div
          v-for="entry in board.entries"
          :key="entry.userId"
          class="d-flex align-items-center justify-content-between p-2 rounded-3 mb-1"
          :class="{ 'bg-primary bg-opacity-10': entry.isCurrentUser }"
        >
          <div class="d-flex align-items-center gap-3">
            <span class="fw-bold text-muted text-center" style="width: 32px;">
              <span v-if="entry.rank === 1">🥇</span>
              <span v-else-if="entry.rank === 2">🥈</span>
              <span v-else-if="entry.rank === 3">🥉</span>
              <span v-else>{{ entry.rank }}</span>
            </span>
            <div
              class="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
              :style="{ width: '40px', height: '40px', background: entry.avatarColor }"
            >
              {{ entry.displayName.charAt(0).toUpperCase() }}
            </div>
            <div>
              <div class="fw-semibold">
                {{ entry.displayName }}
                <span v-if="entry.isCurrentUser" class="badge text-bg-primary ms-1">You</span>
              </div>
              <small class="text-muted">
                {{ entry.breakdown.completions }} completed
                <span v-if="entry.breakdown.milestones > 0">· 🔥 {{ entry.breakdown.milestones }} milestone<span v-if="entry.breakdown.milestones > 1">s</span></span>
              </small>
            </div>
          </div>
          <div class="fw-bold fs-5">{{ entry.points }}</div>
        </div>
      </div>
    </div>

    <p class="text-muted small mt-3 mb-0">
      Points reset every Monday. Nothing is deleted — scores are worked out from your check-in
      history, so the board always matches your habits.
    </p>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { leaderboardService } from '../services/leaderboardService'
import { errorMessage } from '../services/habitService'
import { toDateKey, fromDateKey } from '../utils/dates'

const board = ref(null)
const me = ref(null)
const loading = ref(false)
const error = ref('')

const weekLabel = computed(() => {
  if (!board.value) return ''
  const fmt = (key) =>
    fromDateKey(key).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  return `${fmt(board.value.weekStart)} – ${fmt(board.value.weekEnd)}`
})

async function load() {
  loading.value = true
  error.value = ''
  const today = toDateKey()
  try {
    const [weekly, mine] = await Promise.all([
      leaderboardService.weekly(today),
      leaderboardService.myScore(today),
    ])
    board.value = weekly
    me.value = mine
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
