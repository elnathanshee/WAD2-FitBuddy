<!--
  Google Health card (Home page).
  Health data is simulated: "Sync" sends made-up steps/minutes to
  POST /api/health-sync/simulate, which checks in matching habits for today.
  Shows today's metrics plus a "Latest updates" list from the last sync.
-->
<template>
  <section class="surface p-4 health-card d-flex flex-column" data-testid="google-health">
    <div class="section-head mb-3">
      <div class="d-flex align-items-center gap-2">
        <span class="health-icon" aria-hidden="true"><i class="bi bi-google"></i></span>
        <div>
          <h2 class="section-title">Google Health</h2>
          <div class="text-muted small">{{ lastSyncedLabel }}</div>
        </div>
      </div>
      <button
        type="button"
        class="btn btn-sm btn-tinted px-3 sync-btn"
        :disabled="syncState === 'syncing'"
        data-testid="health-sync-btn"
        @click="syncDevice('Google Health')"
      >
        <Transition name="morph" mode="out-in">
          <span v-if="syncState === 'syncing'" key="syncing" class="d-inline-flex align-items-center gap-1">
            <i class="bi bi-arrow-repeat spin" aria-hidden="true"></i>Syncing
          </span>
          <span v-else-if="syncState === 'done'" key="done" class="d-inline-flex align-items-center gap-1">
            <i class="bi bi-check2" aria-hidden="true"></i>Synced
          </span>
          <span v-else key="idle" class="d-inline-flex align-items-center gap-1">
            <i class="bi bi-arrow-repeat" aria-hidden="true"></i>Sync
          </span>
        </Transition>
      </button>
    </div>

    <!-- Today's metrics: same layout for all four, each with its own colour -->
    <div class="metrics">
      <div v-for="m in metricRows" :key="m.key" class="metric" :style="{ '--metric': m.colour }" :data-testid="`health-${m.key}`">
        <div class="metric-label"><i class="bi" :class="m.icon" aria-hidden="true"></i>{{ m.label }}</div>
        <div class="metric-value display-num"><CountUp :value="m.raw" :decimals="m.decimals" /><small> {{ m.unit }}</small></div>
        <div class="bar"><span :style="{ transform: `scaleX(${ratio(m.raw, m.goal)})` }"></span></div>
        <div class="metric-foot">of {{ m.goalLabel }} {{ m.unit }}</div>
      </div>
    </div>

    <!-- Latest updates from the most recent sync -->
    <div class="mt-4 flex-grow-1">
      <div class="eyebrow mb-2">Latest updates</div>
      <TransitionGroup v-if="updates.length" tag="ul" name="update" class="updates list-unstyled mb-0" data-testid="health-updates">
        <li v-for="u in updates" :key="u.id" class="update">
          <span class="update-dot" aria-hidden="true"></span>
          <span class="flex-grow-1">{{ u.text }}</span>
          <span class="text-muted small text-nowrap">{{ u.time }}</span>
        </li>
      </TransitionGroup>
      <p v-else class="text-muted small mb-0">Sync to pull in your latest activity and auto-check matching habits.</p>
    </div>

    <p v-if="syncError" class="text-danger small mt-3 mb-0" role="alert">{{ syncError }}</p>
  </section>
</template>

<script>
// Kept at module level so the update list survives navigating away and back
import { ref } from 'vue'
const sharedUpdates = ref([])
const lastSyncedAt = ref(null)
</script>

<script setup>
import { computed, onMounted } from 'vue'
import CountUp from '../CountUp.vue'
import { healthSyncService } from '../../services/healthSyncService'
import { errorMessage } from '../../services/habitService'

const emit = defineEmits(['synced'])

const metrics = ref({
  steps: 0,
  stepsGoal: 10000,
  distanceKm: '0.00',
  activeMinutes: 0,
  activeMinutesGoal: 30,
  caloriesBurned: 0,
})

const syncState = ref('idle') // idle | syncing | done
const syncError = ref('')
const updates = sharedUpdates

const ratio = (value, goal) => (goal > 0 ? Math.min(1, value / goal) : 0)

// Distance and calorie goals aren't sent by the server, so derive sensible ones:
// distance = the step goal walked (≈0.78 m per step); calories = a common 500 kcal target
const CALORIE_GOAL = 500

const metricRows = computed(() => {
  const m = metrics.value
  const distanceGoal = Number((m.stepsGoal * 0.00078).toFixed(1))
  return [
    { key: 'steps', label: 'Steps', icon: 'bi-person-walking', colour: 'var(--fb-green-500)',
      raw: m.steps, decimals: 0, unit: '', goal: m.stepsGoal, goalLabel: m.stepsGoal.toLocaleString() },
    { key: 'active', label: 'Active', icon: 'bi-stopwatch', colour: 'var(--fb-amber)',
      raw: m.activeMinutes, decimals: 0, unit: 'min', goal: m.activeMinutesGoal, goalLabel: m.activeMinutesGoal },
    { key: 'distance', label: 'Distance', icon: 'bi-geo-alt', colour: 'var(--fb-blue)',
      raw: Number(m.distanceKm), decimals: 2, unit: 'km', goal: distanceGoal, goalLabel: distanceGoal },
    { key: 'calories', label: 'Calories', icon: 'bi-fire', colour: 'var(--fb-rose)',
      raw: m.caloriesBurned, decimals: 0, unit: 'kcal', goal: CALORIE_GOAL, goalLabel: CALORIE_GOAL },
  ]
})

const lastSyncedLabel = computed(() => {
  if (!lastSyncedAt.value) return "Today's activity"
  return `Last synced ${lastSyncedAt.value.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
})

async function loadMetrics() {
  try {
    const data = await healthSyncService.getTodayMetrics()
    if (data) metrics.value = { ...metrics.value, ...data }
  } catch (err) {
    console.warn('Could not load health metrics:', err)
  }
}

async function syncDevice(deviceType) {
  syncState.value = 'syncing'
  syncError.value = ''
  try {
    const randomSteps = Math.floor(Math.random() * 2500) + 8000
    const randomMins = Math.floor(Math.random() * 25) + 35
    const res = await healthSyncService.simulateSync({
      deviceType,
      steps: randomSteps,
      activeMinutes: randomMins,
    })

    metrics.value.steps = randomSteps
    metrics.value.activeMinutes = randomMins
    metrics.value.distanceKm = (randomSteps * 0.00078).toFixed(2)
    metrics.value.caloriesBurned = Math.round(randomSteps * 0.042)

    const now = new Date()
    lastSyncedAt.value = now
    const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    const habitUpdates = (res.updatedHabits || []).map((h) => ({
      id: `${now.getTime()}-${h.id}`,
      text: `${h.name}: logged ${h.syncedCount} ${h.unit || ''}`.trim(),
      time,
    }))
    updates.value = [
      { id: `${now.getTime()}-steps`, text: `${randomSteps.toLocaleString()} steps · ${randomMins} active min`, time },
      ...habitUpdates,
      ...updates.value,
    ].slice(0, 8)

    syncState.value = 'done'
    setTimeout(() => (syncState.value = 'idle'), 1800)
    emit('synced')
  } catch (err) {
    syncError.value = errorMessage(err)
    syncState.value = 'idle'
  }
}

onMounted(loadMetrics)
</script>

<style scoped>
.health-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--r-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #4285f4;
  border: 1px solid var(--fb-hairline);
}

/* 2 × 2 grid divided by hairlines instead of four little cards */
.metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid var(--fb-hairline);
  border-bottom: 1px solid var(--fb-hairline);
}
.metric {
  padding: var(--s-4) 0 var(--s-4) var(--s-4);
}
.metric:nth-child(odd) {
  padding-left: 0;
  padding-right: var(--s-4);
  border-right: 1px solid var(--fb-hairline);
}
.metric:nth-child(-n + 2) {
  border-bottom: 1px solid var(--fb-hairline);
}
.metric-label {
  display: flex;
  align-items: center;
  gap: var(--s-1);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--fb-text-2);
}
.metric-label i {
  color: var(--metric);
}
.metric-value {
  font-size: 1.9rem;
  margin-top: var(--s-1);
}
.metric-value small {
  font-family: var(--font-body);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--fb-text-2);
}
.metric-foot {
  font-size: 0.72rem;
  color: var(--fb-text-3);
  margin-top: var(--s-1);
}

/* Progress bars fill with scaleX (compositor-only) */
.bar {
  height: 5px;
  border-radius: 999px;
  background: var(--fb-hairline);
  overflow: hidden;
  margin-top: var(--s-2);
}
.bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--metric);
  transform-origin: left;
  transition: transform 600ms var(--ease-out);
}

.updates {
  display: grid;
  gap: var(--s-2);
}
.update {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  font-size: 0.85rem;
}
.update-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4285f4;
  flex-shrink: 0;
}
.update-enter-active {
  transition: opacity 240ms var(--ease-out), transform 240ms var(--ease-out);
}
.update-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}
.update-leave-active {
  display: none;
}

.sync-btn {
  min-width: 96px;
}
/* Label morph: a little blur hides the swap between two labels */
.morph-enter-active,
.morph-leave-active {
  transition: opacity 140ms ease, filter 140ms ease;
}
.morph-enter-from,
.morph-leave-to {
  opacity: 0;
  filter: blur(2px);
}
.spin {
  display: inline-block;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .bar span,
  .update-enter-active {
    transition: none;
  }
}
</style>
