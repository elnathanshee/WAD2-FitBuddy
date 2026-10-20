<template>
  <div class="card border-0 shadow-sm rounded-4 p-4 mb-4">
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
      <div>
        <h5 class="fw-bold mb-0 d-flex align-items-center gap-2">
          <i class="bi bi-lightning-charge-fill text-warning"></i>
          <span>Friend Challenges & Head-to-Head Duels</span>
        </h5>
        <small class="text-muted">Compete 1-on-1 with rival athletes to stay accountable</small>
      </div>

      <button
        class="btn btn-sm btn-primary rounded-pill px-3 d-flex align-items-center gap-1"
        @click="showCreateModal = true"
      >
        <i class="bi bi-plus-circle me-1"></i>New Challenge
      </button>
    </div>

    <!-- Empty state -->
    <div v-if="challenges.length === 0" class="text-center py-4 text-muted">
      <i class="bi bi-shield-shaded fs-1 d-block mb-2 opacity-50"></i>
      <p class="mb-2">No active challenges yet. Challenge a rival athlete to boost your streak!</p>
      <button class="btn btn-outline-primary btn-sm rounded-pill px-3" @click="showCreateModal = true">
        Start First Challenge
      </button>
    </div>

    <!-- Active Challenges Cards -->
    <div v-else class="row g-3">
      <div v-for="ch in challenges" :key="ch.id" class="col-12 col-md-6">
        <div class="p-3 rounded-4 border bg-light h-100 d-flex flex-column justify-content-between">
          <div>
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="badge rounded-pill text-bg-warning px-2 py-1" style="font-size: 11px;">
                {{ ch.habit_category }} · {{ ch.target_days }}-day duel
              </span>
              <span
                class="badge rounded-pill"
                :class="ch.status === 'completed' ? 'text-bg-success' : 'text-bg-secondary'"
                style="font-size: 11px;"
              >
                {{ ch.status === 'completed' ? '🏆 Winner Decided' : '⚔️ Active' }}
              </span>
            </div>

            <h6 class="fw-bold mb-2">{{ ch.title }}</h6>

            <!-- Head-to-head Participants -->
            <div class="d-flex justify-content-between align-items-center text-muted small mb-2">
              <div class="d-flex align-items-center gap-1">
                <span class="rounded-circle d-inline-block" :style="{ width: '10px', height: '10px', backgroundColor: ch.creator_color || '#4F46E5' }"></span>
                <span>{{ ch.creator_name || 'Creator' }}: <strong>{{ ch.creator_progress }}/{{ ch.target_days }}</strong></span>
              </div>
              <span class="fw-bold text-danger">VS</span>
              <div class="d-flex align-items-center gap-1">
                <span>{{ ch.opponent_name || 'Opponent' }}: <strong>{{ ch.opponent_progress }}/{{ ch.target_days }}</strong></span>
                <span class="rounded-circle d-inline-block" :style="{ width: '10px', height: '10px', backgroundColor: ch.opponent_color || '#FF9800' }"></span>
              </div>
            </div>

            <!-- Progress bar -->
            <div class="progress" style="height: 10px;">
              <div
                class="progress-bar bg-primary"
                role="progressbar"
                :style="{ width: Math.round((ch.creator_progress / ch.target_days) * 50) + '%' }"
              ></div>
              <div
                class="progress-bar bg-warning"
                role="progressbar"
                :style="{ width: Math.round((ch.opponent_progress / ch.target_days) * 50) + '%' }"
              ></div>
            </div>
          </div>

          <!-- Bottom Action -->
          <div class="mt-3 pt-2 border-top d-flex justify-content-between align-items-center">
            <small class="text-muted" style="font-size: 11px;">
              {{ ch.status === 'completed' ? 'Finished!' : 'Daily check-in advances progress' }}
            </small>
            <button
              v-if="ch.status !== 'completed'"
              class="btn btn-sm btn-outline-success rounded-pill px-2 py-0"
              style="font-size: 12px;"
              @click="advanceProgress(ch)"
            >
              <i class="bi bi-check2 me-1"></i>Log Progress
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Challenge Modal -->
    <div v-if="showCreateModal" class="modal-backdrop fade show"></div>
    <div
      v-if="showCreateModal"
      class="modal fade show d-block"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow rounded-4">
          <div class="modal-header border-bottom-0 pb-0">
            <h5 class="modal-title fw-bold">⚔️ Issue a Friend Challenge</h5>
            <button type="button" class="btn-close" @click="showCreateModal = false"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="submitChallenge">
              <div class="mb-3">
                <label class="form-label small fw-semibold">Select Opponent</label>
                <select v-model="newChallenge.opponentId" class="form-select rounded-3" required>
                  <option disabled value="">Choose a rival athlete...</option>
                  <option v-for="ath in availableOpponents" :key="ath.id" :value="ath.id">
                    {{ ath.name }} ({{ ath.email }})
                  </option>
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label small fw-semibold">Challenge Title</label>
                <input
                  v-model="newChallenge.title"
                  type="text"
                  class="form-control rounded-3"
                  placeholder="e.g. 7-Day Hydration Sprint, 10k Daily Steps Duel"
                  required
                />
              </div>

              <div class="row g-2 mb-3">
                <div class="col-6">
                  <label class="form-label small fw-semibold">Category</label>
                  <select v-model="newChallenge.habitCategory" class="form-select rounded-3">
                    <option value="exercise">Exercise / Steps</option>
                    <option value="water">Hydration</option>
                    <option value="sleep">Sleep Routine</option>
                    <option value="study">Study Sprint</option>
                  </select>
                </div>
                <div class="col-6">
                  <label class="form-label small fw-semibold">Duration (Days)</label>
                  <select v-model="newChallenge.targetDays" class="form-select rounded-3">
                    <option :value="3">3 Days (Sprint)</option>
                    <option :value="5">5 Days (Workweek)</option>
                    <option :value="7">7 Days (Full Week)</option>
                    <option :value="14">14 Days (Pro)</option>
                  </select>
                </div>
              </div>

              <div class="d-flex justify-content-end gap-2 mt-4">
                <button type="button" class="btn btn-outline-secondary rounded-pill px-3" @click="showCreateModal = false">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary rounded-pill px-4" :disabled="submitting">
                  {{ submitting ? 'Issuing...' : 'Issue Challenge' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { challengeService } from '../../services/challengeService'
import { authService } from '../../services/authService'
import { celebrate } from '../../utils/celebrate'

const challenges = ref([])
const showCreateModal = ref(false)
const submitting = ref(false)

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
  }
}

async function submitChallenge() {
  submitting.value = true
  try {
    await challengeService.createChallenge(newChallenge.value)
    celebrate()
    showCreateModal.value = false
    await loadChallenges()
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to create challenge')
  } finally {
    submitting.value = false
  }
}

async function advanceProgress(ch) {
  try {
    await challengeService.recordProgress(ch.id)
    celebrate()
    await loadChallenges()
  } catch (err) {
    console.error('Progress error:', err)
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

