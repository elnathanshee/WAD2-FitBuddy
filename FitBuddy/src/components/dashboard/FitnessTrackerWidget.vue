<template>
  <div class="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-gradient" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #ffffff;">
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
      <div class="d-flex align-items-center gap-2">
        <div class="rounded-circle bg-danger bg-opacity-25 p-2 d-flex align-items-center justify-content-center text-danger" style="width: 40px; height: 40px;">
          <i class="bi bi-heart-pulse-fill fs-5"></i>
        </div>
        <div>
          <h5 class="fw-bold mb-0 text-white">Fitness Tracker & Apple Health Sync</h5>
          <small class="text-white opacity-75">Simulate real-time wearable telemetry & auto-sync habits</small>
        </div>
      </div>

      <div class="d-flex gap-2">
        <button
          class="btn btn-sm btn-outline-light rounded-pill px-3 d-flex align-items-center gap-1"
          @click="syncDevice('Apple Health')"
          :disabled="syncing"
        >
          <i class="bi bi-apple"></i>
          <span>{{ syncing ? 'Syncing...' : 'Sync Apple Health' }}</span>
        </button>
        <button
          class="btn btn-sm btn-outline-info rounded-pill px-3 d-flex align-items-center gap-1"
          @click="syncDevice('Google Fit')"
          :disabled="syncing"
        >
          <i class="bi bi-google"></i>
          <span>Google Fit</span>
        </button>
      </div>
    </div>

    <!-- Sync Success Banner -->
    <div v-if="syncSuccessMsg" class="alert alert-success alert-dismissible fade show text-dark py-2 px-3 rounded-3 small mb-3" role="alert">
      <i class="bi bi-check-circle-fill text-success me-2"></i>{{ syncSuccessMsg }}
      <button type="button" class="btn-close" @click="syncSuccessMsg = ''" style="padding: 0.75rem;"></button>
    </div>

    <!-- 4 Health Metric Tiles -->
    <div class="row g-3">
      <!-- Steps -->
      <div class="col-6 col-lg-3">
        <div class="p-3 rounded-3 bg-white bg-opacity-10 h-100">
          <div class="text-white opacity-75 small mb-1"><i class="bi bi-person-walking me-1"></i>Daily Steps</div>
          <div class="fs-4 fw-bold text-white mb-1">{{ metrics.steps.toLocaleString() }}</div>
          <div class="progress" style="height: 6px; background-color: rgba(255,255,255,0.2);">
            <div class="progress-bar bg-success" :style="{ width: Math.min(100, Math.round((metrics.steps / metrics.stepsGoal) * 100)) + '%' }"></div>
          </div>
          <small class="text-white opacity-50 mt-1 d-block" style="font-size: 11px;">Goal: {{ metrics.stepsGoal.toLocaleString() }}</small>
        </div>
      </div>

      <!-- Distance -->
      <div class="col-6 col-lg-3">
        <div class="p-3 rounded-3 bg-white bg-opacity-10 h-100">
          <div class="text-white opacity-75 small mb-1"><i class="bi bi-geo-alt-fill me-1"></i>Distance</div>
          <div class="fs-4 fw-bold text-info mb-1">{{ metrics.distanceKm }} <span class="fs-6 fw-normal">km</span></div>
          <small class="text-white opacity-75 d-block mt-2" style="font-size: 12px;">Paced across day</small>
        </div>
      </div>

      <!-- Active Minutes -->
      <div class="col-6 col-lg-3">
        <div class="p-3 rounded-3 bg-white bg-opacity-10 h-100">
          <div class="text-white opacity-75 small mb-1"><i class="bi bi-stopwatch-fill me-1"></i>Active Time</div>
          <div class="fs-4 fw-bold text-warning mb-1">{{ metrics.activeMinutes }} <span class="fs-6 fw-normal">mins</span></div>
          <div class="progress" style="height: 6px; background-color: rgba(255,255,255,0.2);">
            <div class="progress-bar bg-warning" :style="{ width: Math.min(100, Math.round((metrics.activeMinutes / metrics.activeMinutesGoal) * 100)) + '%' }"></div>
          </div>
          <small class="text-white opacity-50 mt-1 d-block" style="font-size: 11px;">Target: {{ metrics.activeMinutesGoal }}m</small>
        </div>
      </div>

      <!-- Calories -->
      <div class="col-6 col-lg-3">
        <div class="p-3 rounded-3 bg-white bg-opacity-10 h-100">
          <div class="text-white opacity-75 small mb-1"><i class="bi bi-fire me-1"></i>Calories Burned</div>
          <div class="fs-4 fw-bold text-danger mb-1">{{ metrics.caloriesBurned }} <span class="fs-6 fw-normal">kcal</span></div>
          <small class="text-white opacity-75 d-block mt-2" style="font-size: 12px;">Active burn</small>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { healthSyncService } from '../../services/healthSyncService'
import { celebrate } from '../../utils/celebrate'

const emit = defineEmits(['synced'])

const metrics = ref({
  steps: 6420,
  stepsGoal: 10000,
  distanceKm: '5.01',
  activeMinutes: 35,
  activeMinutesGoal: 30,
  caloriesBurned: 430,
})

const syncing = ref(false)
const syncSuccessMsg = ref('')

async function loadMetrics() {
  try {
    const data = await healthSyncService.getTodayMetrics()
    if (data) metrics.value = data
  } catch (err) {
    console.warn('Could not load health metrics:', err)
  }
}

async function syncDevice(deviceType) {
  syncing.value = true
  syncSuccessMsg.value = ''
  try {
    const randomSteps = Math.floor(Math.random() * 2500) + 8000
    const randomMins = Math.floor(Math.random() * 25) + 35
    const res = await healthSyncService.simulateSync({
      deviceType,
      steps: randomSteps,
      activeMinutes: randomMins,
    })

    celebrate()
    metrics.value.steps = randomSteps
    metrics.value.activeMinutes = randomMins
    metrics.value.distanceKm = (randomSteps * 0.00078).toFixed(2)
    metrics.value.caloriesBurned = Math.round(randomSteps * 0.042)

    const updatedNames = res.updatedHabits?.map((h) => h.name).join(', ')
    syncSuccessMsg.value = `Synced ${deviceType}! Automatically checked in for: ${updatedNames || 'Active Habits'}`
    emit('synced')
  } catch (err) {
    console.error('Device sync error:', err)
  } finally {
    syncing.value = false
  }
}

onMounted(loadMetrics)
</script>
