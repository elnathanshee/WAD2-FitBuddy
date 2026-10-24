<!--
  Friend challenges: head-to-head duels between two athletes.
  With `activeOnly` (Home page) finished duels are hidden.
-->
<template>
  <section class="surface p-4" data-testid="home-challenges">
    <div class="section-head">
      <div>
        <h2 class="section-title">{{ activeOnly ? 'Active challenges' : 'Challenges' }}</h2>
        <div class="text-muted small">Head-to-head duels keep you accountable</div>
      </div>
    </div>

    <div v-if="loading" class="d-grid gap-3">
      <div v-for="n in 2" :key="n" class="skeleton" style="height: 72px"></div>
    </div>

    <template v-else>
      <p v-if="visibleChallenges.length === 0" class="text-muted mb-3" data-testid="challenges-empty">
        No active challenges. Challenge a friend to stay on track.
      </p>

      <!-- One row per duel, separated by hairlines -->
      <ul v-else class="duels divided list-unstyled mb-3 stagger">
        <li v-for="ch in visibleChallenges" :key="ch.id" class="duel" data-testid="challenge-card">
          <div class="duel-head">
            <div class="min-w-0">
              <h3 class="duel-title">{{ ch.title }}</h3>
              <div class="duel-meta">
                <span class="text-capitalize">{{ ch.habit_category }}</span> · {{ ch.target_days }}-day duel
                <template v-if="ch.status === 'completed'"> · Finished</template>
              </div>
            </div>
            <button
              v-if="ch.status !== 'completed'"
              type="button"
              class="btn btn-sm btn-outline-success px-3"
              :disabled="advancingId === ch.id"
              @click="advanceProgress(ch)"
            >
              <i class="bi bi-check2 me-1" aria-hidden="true"></i>Log day
            </button>
          </div>

          <div v-for="side in sides(ch)" :key="side.key" class="racer">
            <span class="racer-name">{{ side.name }}</span>
            <span class="track"><span :style="{ transform: `scaleX(${share(side.progress, ch.target_days)})`, background: side.colour }"></span></span>
            <span class="racer-score display-num">{{ side.progress }}/{{ ch.target_days }}</span>
          </div>
        </li>
      </ul>

      <button type="button" class="btn btn-outline-primary px-3" data-testid="new-challenge-btn" @click="showCreateModal = true">
        <i class="bi bi-plus-lg me-1" aria-hidden="true"></i>Start a challenge
      </button>
    </template>

    <p v-if="error" class="text-danger small mt-3 mb-0" role="alert">{{ error }}</p>

    <!-- Create challenge -->
    <AppModal v-if="showCreateModal" title="New challenge" @close="showCreateModal = false">
      <form id="challenge-form" @submit.prevent="submitChallenge">
        <div class="mb-3">
          <label class="form-label small fw-semibold" for="ch-opponent">Opponent</label>
          <select id="ch-opponent" v-model="newChallenge.opponentId" class="form-select" required>
            <option disabled value="">Choose a friend…</option>
            <option v-for="ath in availableOpponents" :key="ath.id" :value="ath.id">
              {{ ath.name }} ({{ ath.email }})
            </option>
          </select>
        </div>

        <div class="mb-3">
          <label class="form-label small fw-semibold" for="ch-title">Title</label>
          <input
            id="ch-title"
            v-model="newChallenge.title"
            type="text"
            class="form-control"
            placeholder="e.g. 7-Day Hydration Sprint"
            required
          />
        </div>

        <div class="row g-2">
          <div class="col-6">
            <label class="form-label small fw-semibold" for="ch-category">Category</label>
            <select id="ch-category" v-model="newChallenge.habitCategory" class="form-select">
              <option value="exercise">Exercise / Steps</option>
              <option value="water">Hydration</option>
              <option value="sleep">Sleep Routine</option>
              <option value="study">Study Sprint</option>
            </select>
          </div>
          <div class="col-6">
            <label class="form-label small fw-semibold" for="ch-days">Duration</label>
            <select id="ch-days" v-model="newChallenge.targetDays" class="form-select">
              <option :value="3">3 days</option>
              <option :value="5">5 days</option>
              <option :value="7">7 days</option>
              <option :value="14">14 days</option>
            </select>
          </div>
        </div>
        <p v-if="createError" class="text-danger small mt-3 mb-0" role="alert">{{ createError }}</p>
      </form>
      <template #footer>
        <button type="button" class="btn btn-outline-secondary px-3" @click="showCreateModal = false">Cancel</button>
        <button type="submit" form="challenge-form" class="btn btn-primary px-4" :disabled="submitting">
          {{ submitting ? 'Sending…' : 'Send challenge' }}
        </button>
      </template>
    </AppModal>
  </section>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import AppModal from '../habits/AppModal.vue'
import { challengeService } from '../../services/challengeService'
import { errorMessage } from '../../services/habitService'
import { authService } from '../../services/authService'
import { celebrate } from '../../utils/celebrate'

const props = defineProps({
  activeOnly: { type: Boolean, default: false }, // hide finished duels
})

const challenges = ref([])
const loading = ref(true)
const error = ref('')
const createError = ref('')
const advancingId = ref(null)
const showCreateModal = ref(false)
const submitting = ref(false)

const visibleChallenges = computed(() =>
  props.activeOnly ? challenges.value.filter((ch) => ch.status !== 'completed') : challenges.value
)

const share = (progress, target) => (target > 0 ? Math.min(1, progress / target) : 0)

// The two athletes in a duel, as rows for the progress race
const sides = (ch) => [
  { key: 'creator', name: ch.creator_name || 'Creator', progress: ch.creator_progress, colour: ch.creator_color || '#4F46E5' },
  { key: 'opponent', name: ch.opponent_name || 'Opponent', progress: ch.opponent_progress, colour: ch.opponent_color || '#FF9800' },
]

const availableOpponents = ref([
  { id: 'rival_charlie', name: 'Charlie Wong', email: 'charlie@fitbuddy.com' },
  { id: 'rival_alex', name: 'Alex Tan', email: 'alex@fitbuddy.com' },
  { id: 'rival_bernice', name: 'Bernice Lim', email: 'bernice@fitbuddy.com' },
  { id: 'rival_david', name: 'David Lee', email: 'david@fitbuddy.com' },
])

const newChallenge = ref({
  opponentId: 'rival_charlie',
  title: '7-Day Water Hydration Sprint',
  habitCategory: 'water',
  targetDays: 7,
})

async function loadChallenges() {
  try {
    const list = await challengeService.listChallenges()
    challenges.value = list
  } catch (err) {
    console.warn('Failed to load challenges:', err)
  } finally {
    loading.value = false
  }
}

async function submitChallenge() {
  submitting.value = true
  createError.value = ''
  try {
    await challengeService.createChallenge(newChallenge.value)
    celebrate()
    showCreateModal.value = false
    await loadChallenges()
  } catch (err) {
    createError.value = errorMessage(err)
  } finally {
    submitting.value = false
  }
}

async function advanceProgress(ch) {
  advancingId.value = ch.id
  error.value = ''
  try {
    await challengeService.recordProgress(ch.id)
    await loadChallenges()
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    advancingId.value = null
  }
}

onMounted(async () => {
  await loadChallenges()
  try {
    const demoUsers = await authService.getDemoUsers()
    const currentUser = authService.getCurrentUser()
    if (demoUsers.length) {
      availableOpponents.value = demoUsers
        .filter((u) => String(u.id) !== String(currentUser?.id))
        .map((u) => ({ id: u.id, name: u.name, email: u.email }))
    }
  } catch (err) {
    console.warn('Opponents load error:', err)
  }
})
</script>

<style scoped>
.min-w-0 {
  min-width: 0;
}
.duel {
  padding: var(--s-4) 0;
}
.duel:first-child {
  padding-top: 0;
}
.duel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--s-3);
  margin-bottom: var(--s-3);
}
.duel-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
}
.duel-meta {
  font-size: 0.8rem;
  color: var(--fb-text-2);
}
.racer {
  display: grid;
  grid-template-columns: minmax(0, 110px) 1fr auto;
  align-items: center;
  gap: var(--s-3);
  margin-top: var(--s-2);
}
.racer-name {
  font-size: 0.85rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.racer-score {
  font-size: 1.05rem;
  min-width: 2.6rem;
  text-align: right;
}
.track {
  display: block;
  height: 6px;
  border-radius: 999px;
  background: var(--fb-hairline);
  overflow: hidden;
}
.track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  transform-origin: left;
  transition: transform 600ms var(--ease-out);
}
@media (prefers-reduced-motion: reduce) {
  .track span { transition: none; }
}
</style>
