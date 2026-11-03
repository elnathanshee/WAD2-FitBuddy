<!--
  Google Health card on the Home page (Simulated Data Mode).
  Displays simulated wearable activity readings (steps, active minutes, distance
  and calories) and syncs them into matching exercise/activity habits.
-->
<template>
  <section class="surface p-4" data-testid="google-health">
    <div class="section-head">
      <div>
        <h2 class="section-title d-flex align-items-center gap-2">
          <span>Google Health</span>
          <span class="badge text-bg-secondary fw-normal" style="font-size: 0.7rem">Simulated</span>
        </h2>
        <div class="text-muted small">Steps, active minutes, distance &amp; calories (simulated data)</div>
      </div>

      <div class="d-flex align-items-center gap-2">
        <template v-if="connected">
          <button
            type="button"
            class="btn btn-sm btn-tinted px-3"
            data-testid="health-sync-btn"
            :disabled="syncing || loading"
            @click="triggerSync()"
          >
            <i class="bi bi-arrow-repeat me-1" :class="{ spin: syncing }" aria-hidden="true"></i>
            {{ syncing ? 'Syncing…' : 'Sync' }}
          </button>
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary px-2"
            data-testid="health-sync-settings"
            aria-label="Google Health simulation settings"
            title="Simulation settings"
            @click="showSettings = !showSettings"
          >
            <i class="bi bi-sliders" aria-hidden="true"></i>
          </button>
        </template>

        <button
          v-else
          type="button"
          class="btn btn-sm btn-primary px-3"
          :disabled="connecting || loading"
          @click="connectGoogle"
        >
          {{ connecting ? 'Connecting…' : 'Connect' }}
        </button>
      </div>
    </div>

    <!-- Simulation controls panel -->
    <div v-if="showSettings && connected" class="settings-bar mb-3">
      <div class="w-100">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
          <div>
            <div class="fw-semibold small">Simulated Google Health feed</div>
            <div class="text-muted small">
              Choose an activity preset to simulate wearable data and auto-log matching exercise habits.
            </div>
          </div>
          <button
            type="button"
            class="btn btn-sm btn-outline-danger"
            :disabled="disconnecting"
            @click="disconnectGoogle"
          >
            {{ disconnecting ? 'Pausing…' : 'Disconnect' }}
          </button>
        </div>
        <div class="d-flex flex-wrap gap-2 align-items-center">
          <select
            v-model="selectedPreset"
            class="form-select form-select-sm"
            style="max-width: 220px"
            aria-label="Simulated activity preset"
            data-testid="health-preset-select"
          >
            <option value="default">Daily activity (+1,850 steps)</option>
            <option value="walk">Brisk walk (+2,400 steps, 20m)</option>
            <option value="run">5K outdoor run (+5,200 steps, 30m)</option>
            <option value="workout">Gym / HIIT (+1,600 steps, 35m)</option>
          </select>
          <button
            type="button"
            class="btn btn-sm btn-primary"
            :disabled="syncing"
            @click="triggerSync({ preset: selectedPreset })"
          >
            Simulate activity
          </button>
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary"
            :disabled="syncing"
            @click="triggerSync({ reset: true })"
          >
            Reset baseline
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="feedback"
      class="alert py-2 px-3 small mb-3"
      :class="feedbackKind === 'error' ? 'alert-danger' : 'alert-success'"
      role="status"
    >
      {{ feedback }}
    </div>

    <div v-if="loading" class="d-grid gap-2">
      <div v-for="n in 4" :key="n" class="skeleton" style="height: 36px"></div>
    </div>

    <!-- Connected & simulated metrics ready -->
    <template v-else-if="connected && hasMetrics">
      <ul class="metrics divided list-unstyled mb-0">
        <li v-for="m in metricRows" :key="m.key" class="metric" :data-testid="`health-${m.key}`">
          <div class="d-flex justify-content-between align-items-baseline mb-1">
            <span class="small text-muted">{{ m.label }}</span>
            <span class="display-num">
              {{ m.value }}<span v-if="m.goal" class="text-muted small fw-normal"> / {{ m.goal }}</span>
            </span>
          </div>
          <div class="bar">
            <span :style="{ transform: `scaleX(${m.pct})`, backgroundColor: m.colour }"></span>
          </div>
        </li>
      </ul>

      <div v-if="updates.length" class="updates mt-3" data-testid="health-updates">
        <div class="eyebrow mb-2">Latest updates</div>
        <ul class="divided list-unstyled mb-0 small">
          <li v-for="u in updates" :key="u.id" class="d-flex justify-content-between gap-3 py-1">
            <span>{{ u.text }}</span>
            <span class="text-muted flex-shrink-0">{{ u.when }}</span>
          </li>
        </ul>
      </div>
    </template>

    <!-- Disconnected state -->
    <div v-else class="empty-note">
      <p class="mb-1 fw-semibold">No Google Health account connected.</p>
      <p class="mb-0 text-muted small">
        Connect Google Health to show real activity from your account.
      </p>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { healthSyncService } from '../../services/healthSyncService'
import { errorMessage } from '../../services/habitService'
import { useHealthSyncStore } from '../../stores/healthSync'

const props = defineProps({
  habitsCount: { type: Number, default: 0 },
  completedToday: { type: Number, default: 0 },
})
const emit = defineEmits(['synced'])

const healthSync = useHealthSyncStore()
const updates = computed(() => healthSync.updates)

const loading = ref(true)
const syncing = ref(false)
const connecting = ref(false)
const disconnecting = ref(false)
const showSettings = ref(false)
const selectedPreset = ref('default')

const connected = ref(true)
const connectedAt = ref(null)
const lastSyncError = ref('')
const feedback = ref('')
const feedbackKind = ref('success')

const metrics = ref({
  steps: null,
  stepsGoal: 10000,
  activeMinutes: null,
  activeMinutesGoal: 30,
  distanceKm: null,
  caloriesBurned: null,
})

const hasMetrics = computed(() =>
  [metrics.value.steps, metrics.value.activeMinutes, metrics.value.distanceKm, metrics.value.caloriesBurned]
    .some((value) => typeof value === 'number')
)

const clamp01 = (n) => Math.max(0, Math.min(1, n || 0))

const metricRows = computed(() => {
  const m = metrics.value
  return [
    {
      key: 'steps',
      label: 'Steps',
      value: (m.steps ?? 0).toLocaleString(),
      goal: (m.stepsGoal || 10000).toLocaleString(),
      pct: clamp01((m.steps || 0) / (m.stepsGoal || 10000)),
      colour: 'var(--fb-accent)',
    },
    {
      key: 'active',
      label: 'Active minutes',
      value: `${m.activeMinutes ?? 0} min`,
      goal: `${m.activeMinutesGoal || 30} min`,
      pct: clamp01((m.activeMinutes || 0) / (m.activeMinutesGoal || 30)),
      colour: 'var(--fb-teal)',
    },
    {
      key: 'distance',
      label: 'Distance',
      value: `${m.distanceKm ?? 0} km`,
      goal: '8 km',
      pct: clamp01((m.distanceKm || 0) / 8),
      colour: 'var(--fb-amber)',
    },
    {
      key: 'calories',
      label: 'Calories',
      value: `${m.caloriesBurned ?? 0} kcal`,
      goal: '500 kcal',
      pct: clamp01((m.caloriesBurned || 0) / 500),
      colour: 'var(--fb-coral)',
    },
  ]
})

function resetMetrics() {
  metrics.value = {
    steps: null,
    stepsGoal: 10000,
    activeMinutes: null,
    activeMinutesGoal: 30,
    distanceKm: null,
    caloriesBurned: null,
  }
}

function applyStatus(status) {
  connected.value = Boolean(status?.connected)
  connectedAt.value = status?.connectedAt || null
  healthSync.lastSyncedAt = status?.lastSyncedAt || healthSync.lastSyncedAt
  lastSyncError.value = status?.lastSyncError || ''
}

function applyTodayPayload(data) {
  if (typeof data?.connected === 'boolean') {
    connected.value = data.connected
  }
  lastSyncError.value = data?.lastSyncError || lastSyncError.value
  if (data?.metrics) {
    metrics.value = { ...metrics.value, ...data.metrics }
    healthSync.lastSyncedAt = data.metrics.lastSynced || healthSync.lastSyncedAt
  } else {
    resetMetrics()
  }
}

async function refreshGoogleHealth() {
  loading.value = true
  try {
    const [status, today] = await Promise.all([
      healthSyncService.getStatus(),
      healthSyncService.getTodayMetrics(),
    ])
    applyStatus(status)
    applyTodayPayload(today)
  } catch (err) {
    // Fallback simulated metrics if offline
    connected.value = true
    const baseSteps = 5420 + props.completedToday * 1250
    const baseActive = 22 + props.completedToday * 8
    metrics.value = {
      steps: baseSteps,
      stepsGoal: 10000,
      activeMinutes: baseActive,
      activeMinutesGoal: 30,
      distanceKm: Number((baseSteps * 0.00076).toFixed(2)),
      caloriesBurned: Math.round(baseSteps * 0.042 + baseActive * 4.5),
    }
    lastSyncError.value = errorMessage(err)
  } finally {
    loading.value = false
  }
}

async function connectGoogle() {
  connecting.value = true
  feedback.value = ''
  try {
    const data = await healthSyncService.connectGoogle()
    connected.value = true
    if (data?.metrics) {
      metrics.value = { ...metrics.value, ...data.metrics }
    } else {
      await refreshGoogleHealth()
    }
    feedbackKind.value = 'success'
    feedback.value = data?.message || 'Connected to simulated Google Health data.'
  } catch (err) {
    feedbackKind.value = 'error'
    feedback.value = errorMessage(err)
  } finally {
    connecting.value = false
  }
}

async function triggerSync(options = {}) {
  syncing.value = true
  feedback.value = ''
  try {
    const data = await healthSyncService.syncGoogle(options)
    connected.value = true
    lastSyncError.value = ''
    if (data?.metrics) {
      metrics.value = { ...metrics.value, ...data.metrics }
      healthSync.lastSyncedAt = data.metrics.lastSynced || new Date().toISOString()
    }

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const m = metrics.value
    const fresh = [
      {
        id: `${Date.now()}-summary`,
        text: `${(m.steps || 0).toLocaleString()} steps · ${m.activeMinutes || 0} active min · ${m.distanceKm || 0} km`,
        when: now,
      },
      ...(data?.updatedHabits || []).map((h) => ({
        id: `${Date.now()}-${h.id}`,
        text: `${h.name}: logged ${h.syncedCount} ${h.unit || 'times'}`,
        when: now,
      })),
    ]
    healthSync.updates = [...fresh, ...healthSync.updates].slice(0, 5)
    feedbackKind.value = 'success'
    feedback.value = data?.message || 'Simulated Google Health activity synced.'
    emit('synced', data)
  } catch (err) {
    lastSyncError.value = errorMessage(err)
    feedbackKind.value = 'error'
    feedback.value = lastSyncError.value
  } finally {
    syncing.value = false
  }
}

async function disconnectGoogle() {
  disconnecting.value = true
  feedback.value = ''
  try {
    await healthSyncService.disconnectGoogle()
    connected.value = false
    connectedAt.value = null
    healthSync.lastSyncedAt = null
    lastSyncError.value = ''
    showSettings.value = false
    healthSync.updates = []
    resetMetrics()
    feedbackKind.value = 'success'
    feedback.value = 'Google Health disconnected.'
  } catch (err) {
    feedbackKind.value = 'error'
    feedback.value = errorMessage(err)
  } finally {
    disconnecting.value = false
  }
}

// Beyond WAD2 syllabus: watch refreshes the simulated Google Health baseline
// whenever the user logs or completes a habit on the Home page.
watch(
  () => [props.habitsCount, props.completedToday],
  () => {
    if (connected.value && !loading.value) {
      healthSyncService.getTodayMetrics().then(applyTodayPayload).catch(() => {})
    }
  },
)

onMounted(async () => {
  await refreshGoogleHealth()
})
</script>

<style scoped>
.metric {
  padding: var(--s-3) 0;
}
.metric:first-child {
  padding-top: 0;
}
.metric:last-child {
  padding-bottom: 0;
}
.bar {
  height: 6px;
  border-radius: 999px;
  background: var(--fb-hairline);
  overflow: hidden;
}
.bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  transform-origin: left;
  transition: transform 600ms var(--ease-out);
}
.settings-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-3);
  border-radius: var(--r-md);
  background: var(--fb-surface-2);
}
.empty-note {
  padding: var(--s-3);
  border-radius: var(--r-md);
  background: var(--fb-surface-2);
}
.spin {
  display: inline-block;
  animation: spin 0.9s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
  .bar span, .spin { transition: none; animation: none; }
}
</style>
