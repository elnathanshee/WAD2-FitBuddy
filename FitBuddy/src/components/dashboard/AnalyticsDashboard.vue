<template>
  <div class="card border-0 shadow-sm rounded-4 p-3 p-md-4 mb-4" data-testid="analytics-dashboard">
    <!-- Header: title, Day/Week/Month tabs -->
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
      <h5 class="fw-bold mb-0 d-flex align-items-center gap-2">
        <i class="bi bi-bar-chart-line-fill text-primary"></i>
        <span>Analytics</span>
      </h5>
      <div class="btn-group" role="group" aria-label="Period">
        <button
          v-for="option in PERIOD_OPTIONS"
          :key="option.value"
          type="button"
          class="btn btn-sm"
          :class="period === option.value ? 'btn-primary' : 'btn-outline-primary'"
          :data-testid="`analytics-tab-${option.value}`"
          @click="changePeriod(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <!-- Period navigation: ‹ October 2026 › -->
    <div class="d-flex align-items-center justify-content-between mb-3">
      <button type="button" class="btn btn-sm btn-light rounded-circle" aria-label="Previous period" @click="move(-1)">
        <i class="bi bi-chevron-left"></i>
      </button>
      <div class="text-center">
        <div class="fw-semibold" data-testid="analytics-period-label">{{ periodLabel }}</div>
        <button v-if="offset < 0" type="button" class="btn btn-link btn-sm p-0" @click="move(-offset)">
          Back to {{ PERIOD_OPTIONS.find((o) => o.value === period).current }}
        </button>
      </div>
      <button
        type="button"
        class="btn btn-sm btn-light rounded-circle"
        aria-label="Next period"
        :disabled="offset === 0"
        @click="move(1)"
      >
        <i class="bi bi-chevron-right"></i>
      </button>
    </div>

    <!-- Loading / error / empty states -->
    <div v-if="loading && !data" class="text-center py-5 text-muted">
      <div class="spinner-border spinner-border-sm me-2" role="status"></div>Loading analytics…
    </div>
    <div v-else-if="error" class="alert alert-warning d-flex justify-content-between align-items-center mb-0">
      <span><i class="bi bi-exclamation-triangle me-2"></i>{{ error }}</span>
      <button type="button" class="btn btn-sm btn-outline-dark" @click="load">Try again</button>
    </div>
    <div v-else-if="data && data.habits.length === 0" class="text-center py-5 text-muted">
      <i class="bi bi-clipboard-data fs-1 d-block mb-2"></i>
      No habits yet. <router-link to="/habits">Add a habit</router-link> to start seeing your stats.
    </div>

    <div v-else-if="data" :class="{ 'opacity-50': loading }">
      <!-- Summary cards -->
      <div class="row g-2 g-md-3 mb-4">
        <div class="col-6 col-lg-3">
          <div class="stat-card">
            <div class="stat-label">Completion rate</div>
            <div class="stat-value text-primary" data-testid="analytics-rate">{{ percent(data.summary.completionRate) }}</div>
            <div class="stat-sub">
              {{ data.summary.done }} of {{ data.summary.due }} targets met
              <span v-if="data.summary.change !== null" class="d-block" :class="changeClass">
                <i class="bi" :class="data.summary.change >= 0 ? 'bi-arrow-up-short' : 'bi-arrow-down-short'"></i>{{ Math.abs(data.summary.change) }}% vs {{ previousLabel }}
              </span>
            </div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="stat-card">
            <div class="stat-label">Perfect days</div>
            <div class="stat-value text-success">
              {{ data.summary.perfectDays }}<small class="fs-6 text-muted ms-1">/ {{ data.summary.trackedDays }}</small>
            </div>
            <div class="stat-sub">Days with every daily habit done</div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="stat-card">
            <div class="stat-label">Check-ins</div>
            <div class="stat-value">{{ data.summary.checkIns }}</div>
            <div class="stat-sub">Across {{ data.summary.activeHabits }} active habit{{ data.summary.activeHabits === 1 ? '' : 's' }}</div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="stat-card">
            <div class="stat-label">Best current streak</div>
            <div class="stat-value text-warning">
              🔥 {{ bestStreak.streak.current }}<small class="fs-6 text-muted ms-1">{{ bestStreak.streak.unit }}</small>
            </div>
            <div class="stat-sub text-truncate">{{ bestStreak.streak.current > 0 ? `${bestStreak.icon} ${bestStreak.name}` : 'Check in to start one' }}</div>
          </div>
        </div>
      </div>

      <!-- Charts -->
      <div class="row g-4 mb-4">
        <!-- Month: heatmap + daily trend -->
        <template v-if="data.period === 'month'">
          <div class="col-12 col-md-6 col-lg-4">
            <h6 class="fw-semibold mb-3">Month at a glance</h6>
            <MonthlyHeatmap :days="data.days" :today="data.today" />
          </div>
          <div class="col-12 col-md-6 col-lg-5">
            <h6 class="fw-semibold mb-3">Daily completion trend</h6>
            <div class="chart-box"><Line :data="trendChart" :options="percentOptions" /></div>
          </div>
        </template>

        <!-- Week: completion per day -->
        <div v-else-if="data.period === 'week'" class="col-12 col-lg-7">
          <h6 class="fw-semibold mb-3">Daily habits completed each day</h6>
          <div class="chart-box"><Bar :data="weekChart" :options="percentOptions" /></div>
        </div>

        <!-- Day: progress toward each habit's target -->
        <div v-else class="col-12 col-lg-7">
          <h6 class="fw-semibold mb-3">Progress toward each target</h6>
          <div class="chart-box"><Bar :data="dayChart" :options="dayOptions" /></div>
        </div>

        <div class="col-12" :class="data.period === 'month' ? 'col-lg-3' : 'col-lg-5'">
          <h6 class="fw-semibold mb-3">Check-ins by category</h6>
          <div v-if="data.summary.checkIns > 0" class="chart-box">
            <Doughnut :data="categoryChart" :options="doughnutOptions" />
          </div>
          <p v-else class="text-muted small">No check-ins in this period yet.</p>
        </div>
      </div>

      <!-- Per-habit completion rates and streaks -->
      <div class="d-flex justify-content-between align-items-baseline flex-wrap gap-2 mb-2">
        <h6 class="fw-semibold mb-0">Habits &amp; streaks</h6>
        <small class="text-muted">
          Perfect-day streak: <strong>{{ data.perfectDayStreak.current }}</strong> (best {{ data.perfectDayStreak.longest }})
        </small>
      </div>
      <div class="table-responsive">
        <table class="table table-sm align-middle mb-0">
          <thead>
            <tr class="small text-muted">
              <th>Habit</th>
              <th class="text-nowrap" style="min-width: 120px;">Completion</th>
              <th class="text-center">Streak</th>
              <th class="text-center">Best</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="habit in data.habits" :key="habit.id" data-testid="analytics-habit-row">
              <td>
                <span class="me-1">{{ habit.icon }}</span>{{ habit.name }}
                <span class="badge text-bg-light fw-normal ms-1">{{ habit.frequency === 'weekly' ? 'Weekly' : 'Daily' }}</span>
              </td>
              <td>
                <template v-if="habit.due > 0">
                  <div class="progress" style="height: 6px;">
                    <div class="progress-bar" :style="{ width: `${habit.rate}%`, backgroundColor: rateColour(habit.rate) }"></div>
                  </div>
                  <small class="text-muted">{{ habit.done }}/{{ habit.due }} {{ habit.frequency === 'weekly' ? 'weeks' : 'days' }} · {{ habit.rate }}%</small>
                </template>
                <small v-else class="text-muted">Not due yet</small>
              </td>
              <td class="text-center fw-semibold">{{ habit.streak.current }}</td>
              <td class="text-center text-muted">{{ habit.streak.longest }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="small text-muted mt-2 mb-0">
        Streaks are as of today, in days for daily habits and weeks for weekly habits.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Bar, Line, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import MonthlyHeatmap from './MonthlyHeatmap.vue'
import { analyticsService } from '../../services/analyticsService'
import { LEVELS, levelFor } from '../../utils/completionLevels'
import { CATEGORIES } from '../../utils/habitOptions'
import { fromDateKey } from '../../utils/dates'

ChartJS.register(BarElement, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Filler, Tooltip, Legend)

const PERIOD_OPTIONS = [
  { value: 'day', label: 'Day', current: 'today', previous: 'previous day' },
  { value: 'week', label: 'Week', current: 'this week', previous: 'last week' },
  { value: 'month', label: 'Month', current: 'this month', previous: 'last month' },
]

const CATEGORY_COLOURS = { exercise: '#0d6efd', water: '#0dcaf0', sleep: '#6f42c1', study: '#fd7e14' }
const EXTRA_COLOURS = ['#20c997', '#d63384', '#ffc107', '#6c757d', '#198754']

const period = ref('month')
const offset = ref(0)
const data = ref(null)
const loading = ref(false)
const error = ref('')
let latestRequest = 0

async function load() {
  // Clicking tabs/arrows quickly starts several requests; only the newest
  // one may update the page, even if an older one finishes after it.
  const request = ++latestRequest
  loading.value = true
  error.value = ''
  try {
    const result = await analyticsService.getSummary(period.value, offset.value)
    if (request === latestRequest) data.value = result
  } catch (err) {
    if (request === latestRequest) error.value = err.response?.data?.message || 'Could not load your analytics.'
  } finally {
    if (request === latestRequest) loading.value = false
  }
}

function changePeriod(value) {
  if (value === period.value) return
  period.value = value
  offset.value = 0
  load()
}

function move(step) {
  offset.value = Math.min(0, offset.value + step)
  load()
}

// ---- Labels ---------------------------------------------------------------
// Built from the loaded data (not the selected tab), so they never describe a
// period that is still loading.

const shortDate = (key, extra = {}) =>
  fromDateKey(key).toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...extra })

const periodLabel = computed(() => {
  if (!data.value) return ''
  const { from, to, period: shown, offset: back } = data.value
  if (shown === 'month') {
    return fromDateKey(from).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  }
  if (shown === 'week') return `${shortDate(from)} – ${shortDate(to, { year: 'numeric' })}`
  if (back === 0) return `Today · ${shortDate(from)}`
  if (back === -1) return `Yesterday · ${shortDate(from)}`
  return shortDate(from, { weekday: 'long', year: 'numeric' })
})

const previousLabel = computed(() => PERIOD_OPTIONS.find((o) => o.value === data.value.period).previous)

const changeClass = computed(() => (data.value.summary.change >= 0 ? 'text-success' : 'text-danger'))

function percent(value) {
  return value === null ? '–' : `${value}%`
}

function rateColour(rate) {
  return LEVELS[Math.max(1, levelFor(rate))].colour
}

const bestStreak = computed(() =>
  data.value.habits.reduce((best, h) => (h.streak.current > best.streak.current ? h : best)),
)

// ---- Chart data -----------------------------------------------------------

const weekChart = computed(() => ({
  labels: data.value.days.map((d) => fromDateKey(d.date).toLocaleDateString(undefined, { weekday: 'short' })),
  datasets: [
    {
      label: 'Completion',
      data: data.value.days.map((d) => d.rate),
      backgroundColor: data.value.days.map((d) => LEVELS[Math.max(0, levelFor(d.rate))].colour),
      borderRadius: 6,
    },
  ],
}))

const trendChart = computed(() => ({
  labels: data.value.days.map((d) => Number(d.date.slice(8))),
  datasets: [
    {
      label: 'Completion',
      data: data.value.days.map((d) => d.rate),
      borderColor: '#198754', // the app's primary green (assets/main.css)
      backgroundColor: 'rgba(25, 135, 84, 0.1)',
      fill: true,
      cubicInterpolationMode: 'monotone', // smooth, but never overshoots 0–100%
      pointRadius: 3,
    },
  ],
}))

const dayHabits = computed(() => data.value.habits.filter((h) => h.due > 0))

const dayChart = computed(() => ({
  labels: dayHabits.value.map((h) => `${h.icon} ${h.name}`),
  datasets: [
    {
      label: 'Progress',
      // Share of the target reached, capped at 100%
      data: dayHabits.value.map((h) => Math.min(100, Math.round((h.amount / (h.target * h.due)) * 100))),
      backgroundColor: dayHabits.value.map((h) => (h.done === h.due ? LEVELS[4].colour : LEVELS[1].colour)),
      borderRadius: 6,
    },
  ],
}))

const categoryChart = computed(() => {
  const entries = Object.entries(data.value.categories)
  let extra = 0
  return {
    labels: entries.map(([value]) => CATEGORIES.find((c) => c.value === value && value !== 'other')?.label ?? value),
    datasets: [
      {
        data: entries.map(([, count]) => count),
        backgroundColor: entries.map(([value]) => CATEGORY_COLOURS[value] ?? EXTRA_COLOURS[extra++ % EXTRA_COLOURS.length]),
      },
    ],
  }
})

// ---- Chart options --------------------------------------------------------

const percentScale = { min: 0, max: 100, ticks: { callback: (v) => `${v}%` } }

const percentOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: { y: percentScale },
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: (ctx) => (ctx.raw === null ? 'Nothing due' : `${ctx.raw}%`) } },
  },
}

const dayOptions = {
  ...percentOptions,
  indexAxis: 'y',
  scales: { x: percentScale },
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.raw}% of target` } } },
}

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } },
}

onMounted(load)

// Dashboard.vue calls this after a wearable sync adds a check-in
defineExpose({ load })
</script>

<style scoped>
.stat-card {
  background: #f8f9fa;
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  height: 100%;
}
.stat-label {
  font-size: 12px;
  color: #6c757d;
  font-weight: 600;
}
.stat-value {
  font-size: 1.6rem;
  font-weight: 700;
  line-height: 1.2;
}
.stat-sub {
  font-size: 12px;
  color: #6c757d;
}
.chart-box {
  position: relative;
  height: 240px;
}
</style>
