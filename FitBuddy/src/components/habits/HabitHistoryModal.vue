<!--
  Completion history for one habit: streak numbers and a Monday–Sunday calendar
  of the last 5 weeks.
  Daily habit:  each day is completed, partly done, or missed.
  Weekly habit: days are coloured by their WEEK (completed week / logged /
                nothing logged), with each week's total in an extra column.
-->
<template>
  <AppModal :title="`${habit.icon} ${habit.name} — history`" @close="emit('close')">
    <div data-testid="habit-history">
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading history…</span>
        </div>
      </div>

      <div v-else-if="error" class="alert alert-danger" role="alert">{{ error }}</div>

      <template v-else>
        <div class="row g-2 text-center mb-4">
          <div class="col-4">
            <div class="stat-box">
              <div class="stat-value">
                <i class="bi bi-fire streak-flame" aria-hidden="true"></i>
                <span data-testid="history-current-streak">{{ streak.current }}</span>
              </div>
              <div class="stat-label">Current streak</div>
            </div>
          </div>
          <div class="col-4">
            <div class="stat-box">
              <div class="stat-value">
                <i class="bi bi-trophy text-primary" aria-hidden="true"></i>
                <span data-testid="history-longest-streak">{{ streak.longest }}</span>
              </div>
              <div class="stat-label">Longest streak</div>
            </div>
          </div>
          <div class="col-4">
            <div v-if="isWeekly" class="stat-box">
              <div class="stat-value">{{ weeksHit }}/{{ rows.length }}</div>
              <div class="stat-label">Weeks hit</div>
            </div>
            <div v-else class="stat-box">
              <div class="stat-value">{{ completionRate }}%</div>
              <div class="stat-label">Last {{ RATE_DAYS }} days</div>
            </div>
          </div>
        </div>

        <div class="calendar" :class="{ weekly: isWeekly }" role="grid" :aria-label="`Last ${WEEKS} weeks`">
          <div v-for="day in WEEKDAYS" :key="day" class="calendar-heading" aria-hidden="true">{{ day }}</div>
          <div v-if="isWeekly" class="calendar-heading" aria-hidden="true">Week</div>

          <template v-for="row in rows" :key="row.start">
            <template v-for="(day, i) in row.days" :key="day?.date ?? `${row.start}-future-${i}`">
              <div
                v-if="day"
                class="calendar-day"
                :class="[day.status, { today: day.date === today }]"
                :title="day.label"
                role="gridcell"
                :aria-label="day.label"
                data-testid="history-day"
                :data-date="day.date"
                :data-completed="String(day.status === 'completed')"
              >
                {{ day.dayOfMonth }}
              </div>
              <div v-else aria-hidden="true"></div>
            </template>
            <div
              v-if="isWeekly"
              class="week-total"
              :class="row.completed ? 'done' : row.total > 0 ? 'some' : 'none'"
              role="gridcell"
              :aria-label="`Week of ${row.start}: ${formatAmount(row.total)} of ${formatAmount(habit.target.amount)} ${habit.target.unit}`"
              data-testid="history-week"
              :data-week="row.start"
              :data-completed="String(row.completed)"
            >
              <i v-if="row.completed" class="bi bi-check-lg" aria-hidden="true"></i>
              <span v-else>{{ formatAmount(row.total) }}</span>
            </div>
          </template>
        </div>

        <div class="d-flex flex-wrap justify-content-center gap-3 small text-muted mt-3">
          <template v-if="isWeekly">
            <span><span class="legend-swatch completed"></span>Week target hit</span>
            <span><span class="legend-swatch partial"></span>Logged</span>
            <span><span class="legend-swatch missed"></span>Nothing logged</span>
          </template>
          <template v-else>
            <span><span class="legend-swatch completed"></span>Completed</span>
            <span><span class="legend-swatch partial"></span>Partly done</span>
            <span><span class="legend-swatch missed"></span>Missed</span>
          </template>
        </div>
        <p v-if="isWeekly" class="text-center text-muted small mt-2 mb-0">
          Week target: {{ formatAmount(habit.target.amount) }} {{ habit.target.unit }} (Monday–Sunday)
        </p>
      </template>
    </div>
  </AppModal>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import AppModal from './AppModal.vue'
import { habitService, errorMessage } from '../../services/habitService'
import { toDateKey, addDays, fromDateKey, weekStart } from '../../utils/dates'
import { formatAmount } from '../../utils/habitOptions'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const RATE_DAYS = 30
const WEEKS = 5

const props = defineProps({
  habit: { type: Object, required: true },
})
const emit = defineEmits(['close'])

const isWeekly = computed(() => props.habit.frequency === 'weekly')

// The last 5 whole weeks: from the Monday 4 weeks before this week, up to today.
const today = toDateKey()
const from = addDays(weekStart(today), -7 * (WEEKS - 1))

const loading = ref(true)
const error = ref('')
const checkIns = ref([])
const weekTotals = ref([]) // weekly habits only: [{ start, total, completed }]
const streak = ref({ current: 0, longest: 0 })

onMounted(async () => {
  try {
    const data = await habitService.history(props.habit._id, { from, to: today, today })
    checkIns.value = data.checkIns
    weekTotals.value = data.weeks ?? []
    streak.value = data.streak
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
})

// Status of one day. The API only returns days that have a check-in, so a day
// that isn't in the list had nothing logged.
function dayStatus(checkIn) {
  if (!checkIn) return 'missed'
  return checkIn.completed ? 'completed' : 'partial'
}

// Every day in the range, oldest first.
const days = computed(() => {
  const byDate = new Map(checkIns.value.map((c) => [c.date, c]))
  const result = []
  for (let date = from; date <= today; date = addDays(date, 1)) {
    const checkIn = byDate.get(date)
    const nice = fromDateKey(date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
    const logged = `${formatAmount(checkIn?.count ?? 0)} ${props.habit.target.unit}`
    result.push({
      date,
      status: dayStatus(checkIn),
      dayOfMonth: fromDateKey(date).getDate(),
      label: isWeekly.value
        ? `${nice}: ${logged} logged`
        : `${nice}: ${formatAmount(checkIn?.count ?? 0)} / ${formatAmount(props.habit.target.amount)} ${props.habit.target.unit}`,
    })
  }
  return result
})

// Days grouped into Monday–Sunday rows. Days after today are null (blank cells).
const rows = computed(() => {
  const totals = new Map(weekTotals.value.map((w) => [w.start, w]))
  const result = []
  for (let i = 0; i < WEEKS; i++) {
    const start = addDays(from, i * 7)
    const rowDays = days.value.slice(i * 7, i * 7 + 7)
    while (rowDays.length < 7) rowDays.push(null)
    result.push({
      start,
      days: rowDays,
      total: totals.get(start)?.total ?? 0,
      completed: totals.get(start)?.completed ?? false,
    })
  }
  return result
})

const completionRate = computed(() => {
  const recent = days.value.slice(-RATE_DAYS)
  const completed = recent.filter((day) => day.status === 'completed').length
  return Math.round((completed / recent.length) * 100)
})

const weeksHit = computed(() => rows.value.filter((row) => row.completed).length)
</script>

<style scoped>
.stat-box {
  background: var(--fb-bg);
  border-radius: 0.75rem;
  padding: 0.75rem 0.25rem;
}
.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
}
.stat-label {
  font-size: 0.75rem;
  color: #6c757d;
}
.calendar {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.35rem;
}
/* weekly habits get an extra "Week" total column */
.calendar.weekly {
  grid-template-columns: repeat(7, 1fr) 1.3fr;
}
.week-total {
  display: grid;
  place-items: center;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
}
.week-total.none {
  background-color: #e9ecef;
  color: #6c757d;
}
.week-total.some {
  background-color: #fff3cd;
  color: #664d03;
}
.streak-flame {
  color: #fd7e14;
}
.week-total.done {
  background-color: var(--fb-primary);
  color: #fff;
  font-size: 1rem;
}
.calendar-heading {
  text-align: center;
  font-size: 0.7rem;
  color: #6c757d;
  font-weight: 600;
}
.calendar-day {
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
}
.completed {
  background-color: var(--fb-primary);
  color: #fff;
}
.partial {
  background-color: #a3cfbb;
  color: #0a3622;
}
.missed {
  background-color: #e9ecef;
  color: #6c757d;
}
.calendar-day.today {
  outline: 2px solid var(--fb-dark);
  outline-offset: 1px;
}
.legend-swatch {
  display: inline-block;
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 0.2rem;
  margin-right: 0.3rem;
  vertical-align: -0.1rem;
}
</style>
