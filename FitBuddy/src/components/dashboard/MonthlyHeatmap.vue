<template>
  <div data-testid="monthly-heatmap">
    <!-- A normal month calendar: one row per week, Mon–Sun columns. Seven equal
         columns scale with the container, so it fits any screen width. -->
    <div class="calendar">
      <span v-for="name in WEEKDAYS" :key="name" class="weekday" aria-hidden="true">{{ name.charAt(0) }}<span class="d-none d-sm-inline">{{ name.slice(1) }}</span></span>
      <template v-for="week in weeks" :key="week[0].date">
        <template v-for="cell in week" :key="cell.date">
          <button
            v-if="cell.inMonth"
            type="button"
            class="cell"
            :class="{
              empty: cell.level === -1,
              today: cell.date === today,
              selected: cell.date === selectedDate,
            }"
            :style="cellStyle(cell)"
            :aria-label="describe(cell)"
            :title="describe(cell)"
            :data-date="cell.date"
            :data-level="cell.level"
            data-testid="heatmap-day"
            @click="selectedDate = cell.date"
          >
            {{ cell.dayOfMonth }}
          </button>
          <span v-else class="cell outside" aria-hidden="true"></span>
        </template>
      </template>
    </div>

    <!-- Details for the tapped day (hover titles don't exist on phones) -->
    <p class="small mb-3 mt-3" data-testid="heatmap-detail">
      <template v-if="selectedDay">
        <strong>{{ formatDay(selectedDay.date) }}:</strong> {{ summaryText(selectedDay) }}
      </template>
      <span v-else class="text-muted">Tap a day to see its details.</span>
    </p>

    <!-- Legend -->
    <ul class="legend list-unstyled mb-0">
      <li v-for="level in LEVELS" :key="level.label">
        <span class="swatch" :style="{ backgroundColor: level.colour }"></span>{{ level.label }}
      </li>
      <li><span class="swatch empty"></span>Nothing due / future</li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { LEVELS, levelFor } from '../../utils/completionLevels'
import { addDays, fromDateKey, weekStart } from '../../utils/dates'

const props = defineProps({
  // From GET /api/analytics/summary?period=month: one entry per day of the month
  days: { type: Array, required: true },
  today: { type: String, required: true },
})

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const selectedDate = ref(null)

// Default to today when it's in this month, otherwise nothing selected
watch(
  () => props.days,
  (days) => {
    selectedDate.value = days.some((d) => d.date === props.today) ? props.today : null
  },
  { immediate: true },
)

const selectedDay = computed(() => props.days.find((d) => d.date === selectedDate.value))

// Columns of 7 cells (Mon–Sun). Days before the 1st or after the last day of
// the month are placeholders so every column lines up.
const weeks = computed(() => {
  if (props.days.length === 0) return []
  const byDate = new Map(props.days.map((d) => [d.date, d]))
  const last = props.days[props.days.length - 1].date
  const columns = []
  for (let monday = weekStart(props.days[0].date); monday <= last; monday = addDays(monday, 7)) {
    columns.push(
      WEEKDAYS.map((_, i) => {
        const date = addDays(monday, i)
        const day = byDate.get(date)
        if (!day) return { date, inMonth: false }
        return { ...day, inMonth: true, dayOfMonth: Number(date.slice(8)), level: levelFor(day.rate) }
      }),
    )
  }
  return columns
})

function cellStyle(cell) {
  if (cell.level === -1) return {}
  const level = LEVELS[cell.level]
  return { backgroundColor: level.colour, color: level.text }
}

function formatDay(date) {
  return fromDateKey(date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

function summaryText(day) {
  if (day.future) return 'Still to come.'
  if (day.due === 0) return 'No daily habits were due.'
  return `${day.done} of ${day.due} daily habits done (${day.rate}%)`
}

function describe(cell) {
  return `${formatDay(cell.date)}: ${summaryText(cell)}`
}
</script>

<style scoped>
.calendar {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--s-2);
  max-width: 420px;
}
.weekday {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-align: center;
  color: var(--fb-text-2);
  padding-bottom: 2px;
}
.cell {
  aspect-ratio: 1;
  min-width: 0;
  border: 0;
  border-radius: var(--r-sm);
  padding: 0;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--dur-press) var(--ease-out);
}
button.cell:active {
  transform: scale(0.94);
}
@media (hover: hover) and (pointer: fine) {
  button.cell:hover {
    transform: scale(1.05);
  }
}
.cell.empty {
  background: transparent;
  border: 1px dashed var(--fb-hairline);
  color: var(--fb-text-3);
}
.cell.outside {
  visibility: hidden;
}
.cell.today {
  box-shadow: 0 0 0 2px var(--fb-surface), 0 0 0 4px var(--fb-text);
}
.cell.selected {
  outline: 2px solid var(--fb-text);
  outline-offset: 1px;
}
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-1) var(--s-4);
  font-size: 0.8rem;
  color: var(--fb-text-2);
}
.legend li {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
}
.swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  display: inline-block;
}
.swatch.empty {
  border: 1px dashed var(--fb-text-3);
}
</style>
