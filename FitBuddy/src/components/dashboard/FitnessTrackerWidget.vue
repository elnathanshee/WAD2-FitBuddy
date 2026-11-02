<!--
  Google Health card (Home page).
  Connects to Google Health with the user's permission and reads real activity.
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
      <div class="d-flex align-items-center gap-2">
        <button type="button" class="btn btn-sm btn-outline-secondary px-2" data-testid="health-sync-settings" :aria-expanded="showSettings" @click="showSettings = !showSettings">
          <i class="bi bi-sliders2" aria-hidden="true"></i><span class="visually-hidden">Edit sync targets</span>
        </button>
        <button v-if="connected"
          type="button"
          class="btn btn-sm btn-tinted px-3 sync-btn"
          :disabled="syncState === 'syncing'"
          data-testid="health-sync-btn"
          @click="syncDevice"
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
        <button v-else type="button" class="btn btn-sm btn-tinted px-3" :disabled="connecting" @click="connectGoogle">{{ connecting ? 'Opening…' : 'Connect' }}</button>
      </div>
    </div>

    <p v-if="!connected" class="text-muted small mb-3">Connect your Google Health account to read steps, active minutes, distance, and activity calories. FitBuddy uses them to show your progress and update only the habits you select.</p>

    <details class="healthy365-help surface-soft p-3 mb-3" data-testid="healthy365-help">
      <summary class="fw-semibold small">
        <i class="bi bi-bluetooth me-1" aria-hidden="true"></i>Using a Healthy 365 / HPB tracker?
      </summary>
      <p class="small text-muted mt-2 mb-2">Pair an HPB tracker with Bluetooth in the Healthy 365 mobile app. Healthy 365 does not offer FitBuddy a direct Bluetooth connection, so FitBuddy can only import the tracker data if it is also available in your Google Health account.</p>
      <ol class="small text-muted ps-3 mb-2">
        <li>In Healthy 365, choose <strong>Pair your tracker or app → HPB Trackers → Pair via Bluetooth</strong>, then follow the pairing prompts.</li>
        <li>Sync the tracker in Healthy 365. If your tracker or its companion app also shares activity with Google Health, connect that same Google account to FitBuddy here.</li>
      </ol>
      <div class="d-flex flex-wrap align-items-center gap-2">
        <a class="small" href="https://help.hpb.gov.sg/ssp/en/pairing-syncing-bought-or-unpaired-hpb-trackers?id=kb_article_view_ssp&sysparm_article=KB0013696" target="_blank" rel="noopener noreferrer">Open HPB Bluetooth pairing guide <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i></a>
        <button v-if="!connected" type="button" class="btn btn-sm btn-outline-secondary" :disabled="connecting" @click="connectGoogle">{{ connecting ? 'Opening…' : 'Connect Google Health' }}</button>
        <span v-else class="small text-success"><i class="bi bi-check-circle me-1" aria-hidden="true"></i>Google Health connected</span>
      </div>
    </details>

    <div v-if="showSettings" class="sync-settings surface-soft p-3 mb-3" data-testid="health-sync-settings-panel">
      <label class="d-flex align-items-center gap-2 fw-semibold small mb-2">
        <input v-model="autoSync" class="form-check-input mt-0" type="checkbox" data-testid="health-auto-sync" :disabled="!connected" @change="saveAutoSync" />
        Automatically sync every 10 minutes while the app is open
      </label>
      <p class="small text-muted mb-2">{{ connected ? 'Live data is read from your linked Google Health account after your permission.' : configured ? 'Connect your Google Health account to read activity from your connected devices.' : `Google Health setup is missing server settings: ${missingConfig.length ? missingConfig.join(', ') : 'status could not be loaded'}.` }}</p>
      <p v-if="!connected" class="small text-muted mb-2">FitBuddy requests read access to steps, active minutes, distance, and activity calories. It uses them to show your metrics and update only the habits you select below.</p>
      <button v-if="connected" type="button" class="btn btn-sm btn-outline-danger mb-2" :disabled="disconnecting" @click="disconnectGoogle">{{ disconnecting ? 'Disconnecting…' : 'Disconnect Google Health' }}</button>
      <p class="small text-muted mb-2">Choose which real measurements can update your habits. Water stays manually tracked in FitBuddy.</p>
      <div v-for="source in syncSources" :key="source.key" class="sync-source mb-2">
        <div class="small fw-semibold mb-1">{{ source.label }}</div>
        <label v-for="habit in source.habits" :key="habit._id" class="sync-habit small">
          <input v-model="mappings[source.key]" class="form-check-input mt-0" type="checkbox" :value="String(habit.id ?? habit._id)" :disabled="mappedElsewhere(habit, source.key)" @change="saveMappings" />
          <span>{{ habit.icon }} {{ habit.name }} <span class="text-muted">({{ habit.target.amount }} {{ habit.target.unit }})</span></span>
        </label>
        <div v-if="!source.habits.length" class="text-muted small">No matching habits yet. Add one on the Habits page.</div>
      </div>
      <div v-if="syncSettingsError" class="small text-danger" role="alert">{{ syncSettingsError }}</div>
    </div>

    <!-- Today's metrics: same layout for all four, each with its own colour -->
    <div v-if="connected" class="metrics">
      <div v-for="m in metricRows" :key="m.key" class="metric" :style="{ '--metric': m.colour }" :data-testid="`health-${m.key}`">
        <div class="metric-label"><i class="bi" :class="m.icon" aria-hidden="true"></i>{{ m.label }}</div>
        <div class="metric-value display-num"><CountUp :value="m.raw" :decimals="m.decimals" /><small> {{ m.unit }}</small></div>
        <div class="bar"><span :style="{ transform: `scaleX(${ratio(m.raw, m.goal)})` }"></span></div>
        <div class="metric-foot">of {{ m.goalLabel }} {{ m.unit }}</div>
      </div>
    </div>
    <div v-else class="surface-soft p-3 text-muted small"><i class="bi bi-shield-lock me-2" aria-hidden="true"></i>Connect Google Health to show real activity from your account. FitBuddy will not generate sample readings.</div>

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
      <p v-else class="text-muted small mb-0">{{ connected ? 'Sync your Google Health activity to refresh this list.' : 'Your recent real syncs will appear here after connecting.' }}</p>
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
import { computed, onMounted, onUnmounted } from 'vue'
import CountUp from '../CountUp.vue'
import { healthSyncService } from '../../services/healthSyncService'
import { errorMessage, habitService } from '../../services/habitService'
import { authService } from '../../services/authService'

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
const syncSettingsError = ref('')
const showSettings = ref(false)
const connected = ref(false)
const configured = ref(false)
const missingConfig = ref([])
const connecting = ref(false)
const disconnecting = ref(false)
const autoSync = ref(false)
const availableHabits = ref([])
const mappings = ref({ steps: [], activeMinutes: [], water: [] })
const updates = sharedUpdates
let autoSyncTimer
const settingsKey = `fitbuddy_health_sync_${authService.getCurrentUser()?.id || 'guest'}`

const syncSources = computed(() => [
  { key: 'steps', label: 'Step tracker', habits: availableHabits.value.filter((h) => h.target?.unit === 'steps' || /step/i.test(h.name)) },
  { key: 'activeMinutes', label: 'Active minutes tracker', habits: availableHabits.value.filter((h) => h.category === 'exercise' || h.target?.unit === 'minutes') },
])

function mappedElsewhere(habit, sourceKey) {
  const id = String(habit.id ?? habit._id)
  return Object.entries(mappings.value).some(([key, ids]) => key !== sourceKey && ids.includes(id))
}

function saveMappings() {
  localStorage.setItem(`${settingsKey}_mappings`, JSON.stringify(mappings.value))
  syncSettingsError.value = ''
}

function saveAutoSync() {
  localStorage.setItem(`${settingsKey}_auto`, String(autoSync.value))
  if (autoSyncTimer) clearInterval(autoSyncTimer)
  if (autoSync.value && connected.value) {
    syncDevice()
    autoSyncTimer = setInterval(() => {
      if (!document.hidden) syncDevice()
    }, 10 * 60 * 1000)
  }
}

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
    connected.value = Boolean(data?.connected)
    if (data?.metrics) {
      metrics.value = { ...metrics.value, ...data.metrics }
      lastSyncedAt.value = data.metrics.lastSynced ? new Date(data.metrics.lastSynced) : null
    }
  } catch (err) {
    console.warn('Could not load health metrics:', err)
  }
}

async function loadSyncSettings() {
  // The OAuth config check must not be blocked by an unrelated habits request.
  // Otherwise one failing endpoint leaves `configured` false and disables Connect.
  try {
    const status = await healthSyncService.getGoogleStatus()
    configured.value = Boolean(status.configured)
    missingConfig.value = Array.isArray(status.missingConfig) ? status.missingConfig : []
    connected.value = Boolean(status.connected)
  } catch (err) {
    configured.value = false
    syncSettingsError.value = errorMessage(err)
  }

  try {
    availableHabits.value = await habitService.list()
  } catch (err) {
    syncSettingsError.value ||= errorMessage(err)
  }

  await loadMetrics()
  const saved = JSON.parse(localStorage.getItem(`${settingsKey}_mappings`) || 'null')
  if (saved && typeof saved === 'object') {
    const eligibleIds = {
      steps: new Set(availableHabits.value.filter((h) => h.target?.unit === 'steps' || /step/i.test(h.name)).map((h) => String(h.id ?? h._id))),
      activeMinutes: new Set(availableHabits.value.filter((h) => h.category === 'exercise' || h.target?.unit === 'minutes').map((h) => String(h.id ?? h._id))),
    }
    mappings.value = {
      steps: (saved.steps || []).map(String).filter((id) => eligibleIds.steps.has(id)),
      activeMinutes: (saved.activeMinutes || []).map(String).filter((id) => eligibleIds.activeMinutes.has(id)),
      water: [],
    }
    saveMappings()
  } else {
    mappings.value = {
      steps: availableHabits.value.filter((h) => h.target?.unit === 'steps' || /step/i.test(h.name)).map((h) => String(h.id ?? h._id)),
      activeMinutes: availableHabits.value.filter((h) => h.category === 'exercise' && h.target?.unit === 'minutes').map((h) => String(h.id ?? h._id)),
      water: [],
    }
    saveMappings()
  }
  autoSync.value = localStorage.getItem(`${settingsKey}_auto`) === 'true'
  if (autoSync.value && connected.value) {
    await syncDevice()
    autoSyncTimer = setInterval(() => {
      if (!document.hidden) syncDevice()
    }, 10 * 60 * 1000)
  }
}

async function syncDevice() {
  if (!connected.value) return
  syncState.value = 'syncing'
  syncError.value = ''
  try {
    const res = await healthSyncService.syncGoogle(mappings.value)
    metrics.value = { ...metrics.value, ...res.metrics }

    const now = new Date()
    lastSyncedAt.value = now
    const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    const habitUpdates = (res.updatedHabits || []).map((h) => ({
      id: `${now.getTime()}-${h.id}`,
      text: `${h.name}: logged ${h.syncedCount} ${h.unit || ''}`.trim(),
      time,
    }))
    updates.value = [
      { id: `${now.getTime()}-steps`, text: `${Number(metrics.value.steps).toLocaleString()} steps · ${metrics.value.activeMinutes} active min from Google Health`, time },
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

async function connectGoogle() {
  connecting.value = true
  syncError.value = ''
  try { await healthSyncService.beginGoogleConnect() }
  catch (err) { syncError.value = errorMessage(err); connecting.value = false }
}

async function disconnectGoogle() {
  disconnecting.value = true
  try {
    await healthSyncService.disconnectGoogle()
    connected.value = false
    autoSync.value = false
    localStorage.setItem(`${settingsKey}_auto`, 'false')
    clearInterval(autoSyncTimer)
    updates.value = []
    lastSyncedAt.value = null
  } catch (err) { syncError.value = errorMessage(err) }
  finally { disconnecting.value = false }
}

onMounted(() => {
  loadSyncSettings()
  const callbackResult = new URL(window.location.href).searchParams.get('googleHealth')
  if (callbackResult) {
    const messages = { 'not-linked': "This Google Account isn't linked to a Google Health profile yet. Open the Google Health app and sign in with this same account to create a profile or migrate your Fitbit account, then return here and connect again.", cancelled: 'Google Health connection was cancelled.', expired: 'Connection expired; please try again.', error: 'Google Health could not connect. Check your Google Cloud setup and try again.' }
    syncError.value = callbackResult === 'connected' ? '' : (messages[callbackResult] || messages.error)
    if (callbackResult === 'connected') { connected.value = true; setTimeout(() => syncDevice(), 0) }
    const url = new URL(window.location.href); url.searchParams.delete('googleHealth'); window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }
})
onUnmounted(() => clearInterval(autoSyncTimer))
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
.sync-settings {
  background: var(--fb-bg);
  border: 1px solid var(--fb-hairline);
  border-radius: var(--r-md);
}
.healthy365-help {
  background: var(--fb-bg);
  border: 1px solid var(--fb-hairline);
  border-radius: var(--r-md);
}
.healthy365-help summary {
  cursor: pointer;
  color: var(--fb-text-1);
}
.healthy365-help summary::marker {
  color: var(--fb-green-500);
}
.sync-source + .sync-source {
  padding-top: .5rem;
  border-top: 1px solid var(--fb-hairline);
}
.sync-habit {
  display: flex;
  align-items: center;
  gap: .5rem;
  margin: .35rem 0;
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
