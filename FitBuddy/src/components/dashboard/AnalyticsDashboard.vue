<template>
  <div data-testid="analytics-dashboard">
    <!-- Toolbar: Day/Week/Month segmented control + period navigation -->
    <div class="toolbar mb-4">
      <div class="segmented" role="tablist" aria-label="Period" :style="{ '--index': periodIndex }">
        <span class="segmented-thumb" aria-hidden="true"></span>
        <button
          v-for="option in PERIOD_OPTIONS"
          :key="option.value"
          type="button"
          role="tab"
          class="segment"
          :class="{ active: period === option.value }"
          :aria-selected="period === option.value"
          :data-testid="`analytics-tab-${option.value}`"
          @click="changePeriod(option.value)"
        >
          {{ option.label }}
        </button>
      </div>

    <!-- Period navigation: ‹ October 2026 › -->
    <div class="period-nav">
      <button type="button" class="btn btn-sm nav-arrow" aria-label="Previous period" @click="move(-1)">
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
        class="btn btn-sm nav-arrow"
        aria-label="Next period"
        :disabled="offset === 0"
        @click="move(1)"
      >
        <i class="bi bi-chevron-right"></i>
      </button>
    </div>
    </div>

    <!-- Loading / error / empty states -->
    <div v-if="loading && !data" aria-busy="true">
      <span class="visually-hidden">Loading analytics…</span>
      <div class="row g-3 mb-4">
        <div v-for="n in 4" :key="n" class="col-6 col-lg-3"><div class="skeleton" style="height: 112px"></div></div>
      </div>
      <div class="skeleton" style="height: 300px"></div>
    </div>
    <div v-else-if="error" class="alert alert-warning d-flex justify-content-between align-items-center mb-0">
      <span><i class="bi bi-exclamation-triangle me-2"></i>{{ error }}</span>
      <button type="button" class="btn btn-sm btn-outline-dark" @click="load">Try again</button>
    </div>
    <div v-else-if="data && data.habits.length === 0" class="surface text-center py-5 text-muted">
      <i class="bi bi-clipboard-data fs-1 d-block mb-2"></i>
      No habits yet. <router-link to="/habits">Add a habit</router-link> to start seeing your stats.
    </div>

    <div v-else-if="data" class="results d-grid gap-4" :class="{ 'is-loading': loading }">
      <!-- Summary: one strip divided by hairlines; completion rate is the focal number -->
      <section class="surface stat-strip">
        <div class="stat stat-main">
          <div class="stat-label">Completion rate</div>
          <div class="stat-value display-num" data-testid="analytics-rate">
            <template v-if="data.summary.completionRate === null">–</template>
            <template v-else><CountUp :value="data.summary.completionRate" />%</template>
          </div>
          <div class="stat-sub">
            {{ data.summary.done }} of {{ data.summary.due }} targets met
            <span v-if="data.summary.change !== null" class="d-block fw-semibold" :class="changeClass">
              <i class="bi" :class="data.summary.change >= 0 ? 'bi-arrow-up-short' : 'bi-arrow-down-short'" aria-hidden="true"></i>{{ Math.abs(data.summary.change) }}% vs {{ previousLabel }}
            </span>
          </div>
        </div>
        <div class="stat">
          <div class="stat-label">Total habits completed</div>
          <div class="stat-value display-num" data-testid="analytics-completed"><CountUp :value="data.summary.done" /></div>
          <div class="stat-sub">Times you hit a habit's target</div>
        </div>
        <div class="stat">
          <div class="stat-label">Current streak</div>
          <div class="stat-value display-num streak-value" data-testid="analytics-current-streak">
            <CountUp :value="data.perfectDayStreak.current" /><small> day{{ data.perfectDayStreak.current === 1 ? '' : 's' }}</small>
          </div>
          <div class="stat-sub">
            In a row with all daily habits done
            <span class="d-block fw-bold">High score: {{ data.perfectDayStreak.longest }}</span>
          </div>
        </div>
      </section>

      <!-- Month: calendar first, then the trend (side by side on wide screens) -->
      <div v-if="data.period === 'month'" class="row g-4">
        <section class="col-12 col-lg-5">
          <div class="surface p-3 p-md-4 h-100">
            <h2 class="section-title mb-3">Month at a glance</h2>
            <MonthlyHeatmap :days="data.days" :today="data.today" />
          </div>
        </section>
        <section class="col-12 col-lg-7">
          <div class="surface p-3 p-md-4 h-100 d-flex flex-column">
            <h2 class="section-title">Daily completion trend</h2>
            <p class="text-muted small mb-3">How much of your daily habits you completed on each day of the month.</p>
            <div class="chart-box chart-fill"><Line :data="trendChart" :options="trendOptions" /></div>
          </div>
        </section>
      </div>

      <!-- Week: completion per day -->
      <section v-else-if="data.period === 'week'" class="surface p-3 p-md-4">
        <h2 class="section-title">Daily habits completed each day</h2>
        <p class="text-muted small mb-3">How much of your daily habits you completed on each day of the week.</p>
        <div class="chart-box"><Bar :data="weekChart" :options="weekOptions" /></div>
      </section>

      <!-- Day: progress toward each habit's target -->
      <section v-else class="surface p-3 p-md-4">
        <h2 class="section-title mb-3">Progress toward each target</h2>
        <div class="chart-box"><Bar :data="dayChart" :options="dayOptions" /></div>
      </section>

      <!-- Per-habit completion rates and streaks -->
      <section v-reveal class="surface p-3 p-md-4">
        <h2 class="section-title mb-3">Habits &amp; streaks</h2>
        <div class="table-responsive">
          <table class="table align-middle mb-0 habits-table">
            <thead>
              <tr>
                <th>Habit</th>
                <th class="text-nowrap completion-col">Completion</th>
                <th class="text-center">Streak</th>
                <th class="text-center d-none d-sm-table-cell">Best</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="habit in data.habits" :key="habit.id" data-testid="analytics-habit-row">
                <td>
                  <span class="me-2" aria-hidden="true">{{ habit.icon }}</span><span class="fw-semibold">{{ habit.name }}</span>
                  <span class="d-block text-muted small">{{ habit.frequency === 'weekly' ? 'Weekly' : 'Daily' }}</span>
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
                <td class="text-center display-num fs-5">{{ habit.streak.current }}</td>
                <td class="text-center text-muted d-none d-sm-table-cell">{{ habit.streak.longest }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="small text-muted mt-2 mb-0">
          Streaks are as of today, in days for daily habits and weeks for weekly habits.
        </p>
      </section>

      <!-- What kinds of habits the user logged most -->
      <section v-reveal class="surface p-3 p-md-4">
        <h2 class="section-title">Activity by category</h2>
        <p class="text-muted small mb-3">How often you logged each type of habit in this period.</p>
        <div v-if="data.summary.checkIns > 0" class="row g-4 align-items-center">
          <div class="col-12 col-md-5">
            <div class="chart-box chart-box-sm"><Pie :data="categoryChart" :options="pieOptions" /></div>
          </div>
          <div class="col-12 col-md-7">
            <ul class="category-list divided list-unstyled mb-0">
              <li v-for="(label, i) in categoryChart.labels" :key="label">
                <span class="swatch" :style="{ backgroundColor: categoryChart.datasets[0].backgroundColor[i] }"></span>
                <span class="flex-grow-1">{{ label }}</span>
                <span class="display-num fs-5">{{ categoryChart.datasets[0].data[i] }}</span>
                <span class="text-muted small ms-1">times · {{ categoryShare(i) }}%</span>
              </li>
            </ul>
          </div>
        </div>
        <p v-else class="text-muted small mb-0">Nothing logged in this period yet.</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Bar, Line, Pie } from 'vue-chartjs'
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
import CountUp from '../CountUp.vue'
import { analyticsService } from '../../services/analyticsService'
import { LEVELS, levelFor } from '../../utils/completionLevels'
import { CATEGORIES } from '../../utils/habitOptions'
import { useBackground } from '../../composables/useBackground'
import { fromDateKey } from '../../utils/dates'

const { isDark } = useBackground()

ChartJS.register(BarElement, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Filler, Tooltip, Legend)

const PERIOD_OPTIONS = [
  { value: 'day', label: 'Day', current: 'today', previous: 'previous day' },
  { value: 'week', label: 'Week', current: 'this week', previous: 'last week' },
  { value: 'month', label: 'Month', current: 'this month', previous: 'last month' },
]

// Same accents as the design tokens in assets/main.css
const CATEGORY_COLOURS = { exercise: '#2f9364', water: '#3b6fb6', sleep: '#7a5aa6', study: '#d98a1c' }
const EXTRA_COLOURS = ['#2a8f8a', '#c4504a', '#b8a13a', '#8f897e', '#1b6343']

// Chart typography and gridlines matched to the rest of the UI
ChartJS.defaults.font.family = getComputedStyle(document.body).fontFamily
ChartJS.defaults.color = '#5d5850'
ChartJS.defaults.borderColor = '#efebe3'
ChartJS.defaults.plugins.tooltip.backgroundColor = 'rgba(28, 27, 24, 0.94)'
ChartJS.defaults.plugins.tooltip.cornerRadius = 8
ChartJS.defaults.plugins.tooltip.padding = 10

const period = ref('month')
const periodIndex = computed(() => PERIOD_OPTIONS.findIndex((o) => o.value === period.value))
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

function rateColour(rate) {
  return LEVELS[Math.max(0, levelFor(rate))].colour
}


// ---- Chart data -----------------------------------------------------------

const weekChart = computed(() => ({
  labels: data.value.days.map((d) => fromDateKey(d.date).toLocaleDateString(undefined, { weekday: 'short' })),
  datasets: [
    {
      label: 'Completion',
      data: data.value.days.map((d) => d.rate),
      backgroundColor: data.value.days.map((d) => LEVELS[Math.max(0, levelFor(d.rate))].colour),
      borderRadius: 8,
    },
  ],
}))

// One point per day of the month. Straight lines (no smoothing) so the line
// never suggests values that didn't happen; each dot uses the calendar colours.
const trendChart = computed(() => ({
  labels: data.value.days.map((d) => Number(d.date.slice(8))),
  datasets: [
    {
      label: 'Daily habits done',
      data: data.value.days.map((d) => d.rate),
      borderColor: '#237a51', // the app's primary green (assets/main.css)
      backgroundColor: 'rgba(35, 122, 81, 0.08)',
      fill: true,
      tension: 0,
      spanGaps: false, // future days (no data) leave the line open
      pointRadius: 3.5,
      pointHoverRadius: 6,
      pointBackgroundColor: data.value.days.map((d) => (d.rate === null ? 'transparent' : LEVELS[Math.max(0, levelFor(d.rate))].colour)),
      pointBorderColor: '#ffffff',
      pointBorderWidth: 1.5,
      borderWidth: 2,
    },
  ],
}))

const monthName = computed(() => fromDateKey(data.value.from).toLocaleDateString(undefined, { month: 'long' }))

const dayHabits = computed(() => data.value.habits.filter((h) => h.due > 0))

const dayChart = computed(() => ({
  labels: dayHabits.value.map((h) => `${h.icon} ${h.name}`),
  datasets: [
    {
      label: 'Progress',
      // Share of the target reached, capped at 100%
      data: dayHabits.value.map((h) => Math.min(100, Math.round((h.amount / (h.target * h.due)) * 100))),
      backgroundColor: dayHabits.value.map((h) => (h.done === h.due ? LEVELS[2].colour : LEVELS[1].colour)),
      borderRadius: 8,
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
        borderColor: isDark.value ? '#232621' : '#ffffff', // thin gaps in the card colour make each slice easy to tell apart
        borderWidth: 2,
      },
    ],
  }
})

const categoryShare = (i) => {
  const counts = categoryChart.value.datasets[0].data
  const total = counts.reduce((a, b) => a + b, 0)
  return total ? Math.round((counts[i] / total) * 100) : 0
}

// ---- Chart options --------------------------------------------------------

// Axis text and gridlines follow the light/dark theme (same values as --fb-text-2 / --fb-hairline)
const chartText = computed(() => (isDark.value ? '#c2c0b7' : '#5d5850'))
const chartGrid = computed(() => (isDark.value ? '#41453e' : '#efebe3'))

const percentScale = { min: 0, max: 100, ticks: { callback: (v) => `${v}%`, stepSize: 25 } }
const axisTitle = (text) => ({ display: true, text, font: { weight: '700' }, color: chartText.value })

// "3 of 4 daily habits done" for a point in the trend / week charts
function dayTooltip(ctx) {
  const day = data.value.days[ctx.dataIndex]
  if (!day || day.rate === null) return day?.future ? 'Still to come' : 'No daily habits due'
  return `${day.rate}% · ${day.done} of ${day.due} daily habits done`
}
const dayTitle = (items) => {
  const day = data.value.days[items[0].dataIndex]
  return fromDateKey(day.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

// Show round-number days on the x axis (1, 5, 10 … 30) instead of every other day
const isLabelledDay = (index) => index === 0 || (index + 1) % 5 === 0

const trendOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: { ...percentScale, ticks: { ...percentScale.ticks, color: chartText.value }, grid: { color: chartGrid.value }, title: axisTitle('Daily habits done (%)') },
    x: {
      title: axisTitle(`Day of ${monthName.value}`),
      ticks: { autoSkip: false, maxRotation: 0, color: chartText.value, callback: (value, index) => (isLabelledDay(index) ? index + 1 : '') },
      grid: { color: (ctx) => (isLabelledDay(ctx.index) ? chartGrid.value : 'transparent') },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { title: dayTitle, label: dayTooltip } },
  },
}))

const weekOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: { ...percentScale, ticks: { ...percentScale.ticks, color: chartText.value }, grid: { color: chartGrid.value }, title: axisTitle('Daily habits done (%)') },
    x: { ticks: { color: chartText.value }, grid: { color: chartGrid.value }, title: axisTitle('Day of the week') },
  },
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { title: dayTitle, label: dayTooltip } },
  },
}))

const dayOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  scales: {
    x: { ...percentScale, ticks: { ...percentScale.ticks, color: chartText.value }, grid: { color: chartGrid.value }, title: axisTitle('Share of today\'s target done (%)') },
    y: { ticks: { color: chartText.value }, grid: { color: chartGrid.value } },
  },
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.raw}% of target` } } },
}))

const pieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false }, // the list beside the chart is the legend
    tooltip: {
      callbacks: {
        label: (ctx) => {
          const total = ctx.dataset.data.reduce((a, b) => a + b, 0)
          return `${ctx.label}: ${ctx.raw} times (${Math.round((ctx.raw / total) * 100)}%)`
        },
      },
    },
  },
}

onMounted(load)

defineExpose({ load })
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--s-3);
}

/* Segmented control: one thumb slides under the selected segment */
.segmented {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: var(--s-1);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.06);
  min-width: 240px;
}
.segmented-thumb {
  position: absolute;
  top: var(--s-1);
  bottom: var(--s-1);
  left: var(--s-1);
  width: calc((100% - 2 * var(--s-1)) / 3);
  border-radius: 8px;
  background: var(--fb-surface);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.06);
  transform: translateX(calc(var(--index) * 100%));
  transition: transform 240ms var(--ease-in-out);
}
.segment {
  position: relative;
  z-index: 1;
  border: 0;
  background: transparent;
  padding: var(--s-2) var(--s-4);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--fb-text-2);
  border-radius: 8px;
  transition: color 150ms ease;
}
.segment.active {
  color: var(--fb-text);
}

.period-nav {
  display: flex;
  align-items: center;
  gap: var(--s-2);
}
.period-nav .text-center {
  min-width: 190px;
}
.nav-arrow {
  width: 34px;
  height: 34px;
  padding: 0;
  border-radius: 50%;
  background: var(--fb-surface);
  border: 1px solid var(--fb-hairline);
}

/* One shrinkable column, so wide content (Chart.js canvases) can't stretch the page on small phones */
.results {
  grid-template-columns: minmax(0, 1fr);
  transition: opacity 150ms ease;
}
.results.is-loading {
  opacity: 0.55;
}

/* Stat strip: 4 columns (2 × 2 on phones) split by hairlines, not 4 cards */
.stat-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.stat {
  padding: var(--s-4) var(--s-5);
  min-width: 0;
}
/* Phones: completion rate across the top, the other two side by side below */
.stat-main {
  grid-column: 1 / -1;
  border-bottom: 1px solid var(--fb-hairline);
}
.stat:nth-child(2) {
  border-right: 1px solid var(--fb-hairline);
}
@media (min-width: 992px) {
  .stat-strip {
    grid-template-columns: 1.3fr 1fr 1fr;
  }
  .stat-main {
    grid-column: auto;
  }
  .stat {
    border-bottom: 0 !important;
    border-right: 1px solid var(--fb-hairline);
  }
  .stat:last-child {
    border-right: 0;
  }
}
.stat-label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--fb-text-2);
}
.stat-value {
  font-size: 2.4rem;
  margin: var(--s-2) 0 var(--s-1);
}
.stat-main .stat-value {
  font-size: 3.4rem;
  color: var(--fb-green-700);
}
.stat-value small {
  font-family: var(--font-body);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--fb-text-2);
}
.streak-value {
  color: var(--fb-amber-text);
}
.stat-sub {
  font-size: 0.8rem;
  color: var(--fb-text-2);
}

.habits-table {
  --bs-table-bg: transparent;
}
.completion-col {
  min-width: 110px;
}
@media (min-width: 576px) {
  .completion-col {
    min-width: 160px;
  }
}
.habits-table th {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--fb-text-2);
}

.category-list li {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-3) 0;
}
.swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}
.chart-box {
  position: relative;
  height: 260px;
}
.chart-box-sm {
  height: 200px;
}
/* Next to the calendar, the trend grows to the same height */
.chart-fill {
  flex: 1;
  min-height: 260px;
}

@media (max-width: 575.98px) {
  .toolbar,
  .segmented,
  .period-nav {
    width: 100%;
  }
  .period-nav {
    justify-content: space-between;
  }
}

@media (prefers-reduced-motion: reduce) {
  .segmented-thumb {
    transition: none;
  }
}
</style>
