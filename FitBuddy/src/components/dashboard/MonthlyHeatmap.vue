<template>
  <div data-testid="monthly-heatmap">
    <!-- Rows are weekdays (Mon at the top), columns are weeks: the same layout as
         GitHub's contribution graph, for one month. -->
    <div class="heatmap" :style="{ gridTemplateColumns: `auto repeat(${weeks.length}, minmax(0, 44px))` }">
      <template v-for="(name, row) in WEEKDAYS" :key="name">
        <span class="weekday small text-muted">{{ name }}</span>
        <template v-for="week in weeks" :key="week[row].date">
          <button
            v-if="week[row].inMonth"
            type="button"
            class="cell"
            :class="{
              empty: week[row].level === -1,
              today: week[row].date === today,
              selected: week[row].date === selectedDate,
            }"
            :style="cellStyle(week[row])"
            :aria-label="describe(week[row])"
            :title="describe(week[row])"
            :data-date="week[row].date"
            :data-level="week[row].level"
            data-testid="heatmap-day"
            @click="selectedDate = week[row].date"
          >
            {{ week[row].dayOfMonth }}
          </button>
          <span v-else class="cell outside" aria-hidden="true"></span>
        </template>
      </template>
    </div>

    <!-- Details for the tapped day (hover titles don't exist on phones) -->
    <p class="small mb-2 mt-3" data-testid="heatmap-detail">
      <template v-if="selectedDay">
        <strong>{{ formatDay(selectedDay.date) }}:</strong> {{ summaryText(selectedDay) }}
      </template>
      <span v-else class="text-muted">Tap a day to see its details.</span>
    </p>

    <!-- Legend -->
    <div class="d-flex align-items-center column-gap-3 row-gap-1 small text-muted flex-wrap">
      <span class="d-inline-flex align-items-center gap-1">
        Less
        <span
          v-for="level in LEVELS"
          :key="level.label"
          class="swatch"
          :style="{ backgroundColor: level.colour }"
          :title="level.label"
        ></span>
        More
      </span>
      <span class="d-inline-flex align-items-center gap-1">
        <span class="swatch empty"></span>Nothing due / future
      </span>
    </div>
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
.heatmap {
  display: grid;
  gap: 4px;
  align-items: center;
}
.weekday {
  font-size: 11px;
  padding-right: 6px;
}
.cell {
  aspect-ratio: 1;
  border: 0;
  border-radius: 6px;
  padding: 0;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease;
}
button.cell:hover {
  transform: scale(1.08);
}
.cell.empty {
  background: transparent;
  border: 1px dashed #d0d7de;
  color: #8c959f;
}
.cell.outside {
  visibility: hidden;
}
.cell.today {
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px #f59f00; /* amber, stands out from the greens */
}
.cell.selected {
  outline: 2px solid #1f2328;
  outline-offset: 1px;
}
.swatch {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  display: inline-block;
}
.swatch.empty {
  border: 1px dashed #d0d7de;
}
</style>
