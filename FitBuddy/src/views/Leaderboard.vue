<template>
  <div class="container py-4" style="max-width: 860px;">

    <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
      <div>
        <h2 class="fw-bold mb-0">🏆 Weekly Leaderboard</h2>
        <p class="text-muted mb-0">{{ weekLabel }} · Powered by Neon PostgreSQL</p>
      </div>
      <button class="btn btn-sm btn-outline-secondary rounded-pill" @click="load" :disabled="loading">
        <i class="bi bi-arrow-clockwise me-1"></i>Refresh
      </button>
    </div>

    <div v-if="error" class="alert alert-danger d-flex align-items-center mt-3" role="alert">
      <i class="bi bi-exclamation-triangle me-2"></i>{{ error }}
    </div>

    <div v-if="toastMsg" class="alert alert-success alert-dismissible fade show mt-3 shadow-sm" role="alert">
      <i class="bi bi-megaphone me-2"></i>{{ toastMsg }}
      <button type="button" class="btn-close" @click="toastMsg = ''"></button>
    </div>

    <!-- Your score card -->
    <div v-if="me" class="card border-0 shadow-sm rounded-4 my-3 bg-gradient" style="background: linear-gradient(135deg, #f8faff 0%, #eef2ff 100%);">
      <div class="card-body p-4">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <div class="text-primary small text-uppercase fw-bold letter-spacing-1">Your Total Points This Week</div>
            <div class="display-5 fw-bold text-dark">{{ me.total }} <span class="fs-6 text-muted fw-normal">pts</span></div>
          </div>
          <div class="d-flex flex-column gap-1 small text-muted">
            <div><i class="bi bi-check-circle-fill text-success me-1"></i><strong>{{ me.completions }}</strong> completed × {{ me.rules.COMPLETION }} pts</div>
            <div><i class="bi bi-stars text-warning me-1"></i><strong>{{ me.allDailyDays }}</strong> perfect days × {{ me.rules.ALL_DAILY }} pts</div>
            <div><i class="bi bi-fire text-danger me-1"></i><strong>{{ me.milestones }}</strong> 7-day milestones × {{ me.rules.STREAK_MILESTONE }} pts</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Social Cheers & Nudges Received Inbox -->
    <div v-if="recentCheers.length > 0" class="card border-0 shadow-sm rounded-4 mb-3">
      <div class="card-body p-3">
        <div class="d-flex align-items-center gap-2 mb-2">
          <i class="bi bi-bell-fill text-warning"></i>
          <span class="small fw-bold text-uppercase text-muted">Recent Buddy Cheers & Nudges</span>
        </div>
        <div class="d-flex flex-wrap gap-2">
          <div
            v-for="ch in recentCheers"
            :key="ch.id"
            class="badge bg-light text-dark border p-2 rounded-pill d-flex align-items-center gap-2"
          >
            <span
              class="rounded-circle d-inline-block"
              :style="{ width: '12px', height: '12px', backgroundColor: ch.sender_color || '#4F46E5' }"
            ></span>
            <span><strong>{{ ch.sender_name }}</strong> sent you a 
              <span v-if="ch.type === 'cheer'">🎉 Cheer</span>
              <span v-else-if="ch.type === 'nudge'">💪 Nudge</span>
              <span v-else>🔥 Boost</span>!
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading && !board" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <div v-else-if="board" class="card border-0 shadow-sm rounded-4">
      <div class="card-body p-3 p-md-4">

        <p v-if="board.entries.length === 0" class="text-muted text-center mb-0 py-4">
          Nobody has any habits yet. Add one and check in to get on the board.
        </p>

        <div
          v-for="entry in board.entries"
          :key="entry.userId"
          class="d-flex align-items-center justify-content-between p-3 rounded-4 mb-2 transition-all"
          :class="{
            'bg-primary bg-opacity-10 border border-primary border-opacity-25': entry.isCurrentUser,
            'bg-light': !entry.isCurrentUser
          }"
        >
          <!-- Left: Rank + Avatar + Name + Metrics -->
          <div class="d-flex align-items-center gap-3">
            <span class="fw-bold fs-5 text-muted text-center" style="width: 36px;">
              <span v-if="entry.rank === 1">🥇</span>
              <span v-else-if="entry.rank === 2">🥈</span>
              <span v-else-if="entry.rank === 3">🥉</span>
              <span v-else>{{ entry.rank }}</span>
            </span>

            <div
              class="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0 shadow-sm"
              :style="{ width: '44px', height: '44px', background: entry.avatarColor, fontSize: '18px' }"
            >
              {{ entry.displayName.charAt(0).toUpperCase() }}
            </div>

            <div>
              <div class="fw-bold d-flex align-items-center gap-1">
                {{ entry.displayName }}
                <span v-if="entry.isCurrentUser" class="badge text-bg-primary ms-1">You</span>
                <span v-if="entry.cheersCount > 0" class="badge rounded-pill text-bg-warning ms-1" style="font-size: 11px;">
                  🎉 {{ entry.cheersCount }}
                </span>
              </div>
              <small class="text-muted d-block">
                {{ entry.breakdown.completions }} habits completed
                <span v-if="entry.breakdown.milestones > 0">· 🔥 {{ entry.breakdown.milestones }} milestone<span v-if="entry.breakdown.milestones > 1">s</span></span>
              </small>
            </div>
          </div>

          <!-- Right: Action Buttons (Cheer / Nudge) + Points -->
          <div class="d-flex align-items-center gap-3">
            <!-- Cheer / Nudge buttons for other athletes -->
            <div v-if="!entry.isCurrentUser" class="d-flex gap-1">
              <button
                class="btn btn-sm btn-outline-warning rounded-pill px-2 py-1"
                @click="cheerAthlete(entry, 'cheer')"
                title="Cheer on this athlete!"
              >
                🎉 Cheer
              </button>
              <button
                class="btn btn-sm btn-outline-primary rounded-pill px-2 py-1"
                @click="cheerAthlete(entry, 'nudge')"
                title="Send a friendly nudge!"
              >
                💪 Nudge
              </button>
            </div>

            <!-- Total Points -->
            <div class="text-end">
              <div class="fw-bold fs-4 text-dark">{{ entry.points }}</div>
              <small class="text-muted" style="font-size: 11px;">points</small>
            </div>
          </div>
        </div>
      </div>
    </div>

    <p class="text-muted small mt-3 mb-0 text-center">
      Points calculate live from completed habit check-ins and reset every Monday.
    </p>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { leaderboardService } from '../services/leaderboardService'
import { errorMessage } from '../services/habitService'
import { toDateKey, fromDateKey } from '../utils/dates'
import { celebrate } from '../utils/celebrate'

const board = ref(null)
const me = ref(null)
const recentCheers = ref([])
const loading = ref(false)
const error = ref('')
const toastMsg = ref('')

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
    const [weekly, mine, cheersData] = await Promise.all([
      leaderboardService.weekly(today),
      leaderboardService.myScore(today),
      leaderboardService.getCheers().catch(() => ({ cheers: [] })),
    ])
    board.value = weekly
    me.value = mine
    recentCheers.value = cheersData?.cheers || []
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
}

async function cheerAthlete(athlete, type) {
  try {
    await leaderboardService.sendCheer(athlete.userId, type)
    celebrate()
    const label = type === 'cheer' ? '🎉 cheered' : '💪 nudged'
    toastMsg.value = `You ${label} ${athlete.displayName}!`
    athlete.cheersCount = (athlete.cheersCount || 0) + 1
    setTimeout(() => {
      toastMsg.value = ''
    }, 4000)
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to send cheer.'
  }
}

onMounted(load)
</script>
