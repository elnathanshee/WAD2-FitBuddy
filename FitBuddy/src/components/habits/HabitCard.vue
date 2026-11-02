<!--
  One habit: progress for its period (today, or this week), streak, and actions.
  Its colour comes from its status (not started / in progress / completed).
  It only displays data and emits events — HabitsPage does the API calls.
-->
<template>
  <div
    class="card habit-card h-100"
    :class="{ 'is-done': isDone }"
    :style="{ '--habit-colour': STATUS[status].colour }"
    data-testid="habit-card"
    :data-status="status"
  >
    <div class="card-body d-flex flex-column">
      <div class="d-flex align-items-start gap-3 mb-3">
        <div class="habit-icon flex-shrink-0" aria-hidden="true">{{ habit.icon }}</div>
        <div class="flex-grow-1 min-w-0">
          <h3 class="habit-title mb-1 text-break">{{ habit.name }}</h3>
          <div class="d-flex flex-wrap gap-2 small">
            <span class="text-muted text-capitalize">{{ habit.category }}</span>
            <span class="text-muted" aria-hidden="true">·</span>
            <span class="text-muted" data-testid="habit-frequency">{{ frequencyText }}</span>
          </div>
          <span class="status-label small fw-semibold" data-testid="habit-status">
            <span class="status-dot" aria-hidden="true"></span>{{ STATUS[status].label }}
          </span>
        </div>
        <div class="text-center flex-shrink-0" :title="`Longest streak: ${habit.streak.longest} ${streakUnit}s`">
          <div class="streak-number display-num" :class="{ 'text-muted': !habit.streak.current }">
            <i class="bi bi-fire" :class="{ 'streak-flame': habit.streak.current }" aria-hidden="true"></i>
            <span data-testid="habit-streak">{{ habit.streak.current }}</span>
          </div>
          <div class="text-muted small">{{ streakUnit }} streak</div>
        </div>
      </div>

      <div class="mb-3">
        <div class="d-flex justify-content-between small mb-1">
          <span class="text-muted">{{ periodLabel(habit) }}</span>
          <span class="fw-semibold">
            <span data-testid="habit-progress">{{ formatAmount(habit.periodCount) }} / {{ formatAmount(habit.target.amount) }}</span>
            {{ habit.target.unit }}
            <i v-if="isDone" class="bi bi-check-circle-fill text-success ms-1 done-check" aria-hidden="true"></i>
          </span>
        </div>
        <div
          class="progress"
          role="progressbar"
          :aria-label="`${habit.name} progress ${periodLabel(habit).toLowerCase()}`"
          :aria-valuenow="habit.periodCount"
          aria-valuemin="0"
          :aria-valuemax="habit.target.amount"
        >
          <div class="progress-bar habit-progress-bar" :style="{ transform: `scaleX(${progressPercent / 100})` }"></div>
        </div>
      </div>

      <button
        type="button"
        class="btn btn-log w-100 mt-auto"
        data-testid="log-btn"
        @click="emit('log', habit)"
      >
        <i class="bi me-1" :class="isDone ? 'bi-plus-lg' : 'bi-pencil-square'" aria-hidden="true"></i>
        {{ isDone ? 'Log more' : 'Log progress' }}
      </button>

      <div class="d-flex justify-content-end gap-1 mt-2 border-top pt-2">
        <button
          type="button"
          class="btn btn-sm btn-link text-decoration-none text-secondary"
          data-testid="habit-history-btn"
          @click="emit('history', habit)"
        >
          <i class="bi bi-calendar3 me-1" aria-hidden="true"></i>History
        </button>
        <button
          type="button"
          class="btn btn-sm btn-link text-decoration-none text-secondary"
          data-testid="habit-edit-btn"
          @click="emit('edit', habit)"
        >
          <i class="bi bi-pencil me-1" aria-hidden="true"></i>Edit
        </button>
        <button
          type="button"
          class="btn btn-sm btn-link text-decoration-none text-danger"
          data-testid="habit-delete-btn"
          @click="emit('delete', habit)"
        >
          <i class="bi bi-trash me-1" aria-hidden="true"></i>Delete
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatAmount, habitStatus, periodLabel, STATUS } from '../../utils/habitOptions'

const props = defineProps({
  // A habit from GET /api/habits, including periodCount and streak
  habit: { type: Object, required: true },
})
const emit = defineEmits(['log', 'history', 'edit', 'delete'])

const status = computed(() => habitStatus(props.habit))
const isDone = computed(() => status.value === 'completed')

const progressPercent = computed(() =>
  Math.min(100, Math.round((props.habit.periodCount / props.habit.target.amount) * 100))
)

const frequencyText = computed(() => (props.habit.frequency === 'weekly' ? 'Weekly' : 'Daily'))
const streakUnit = computed(() => (props.habit.frequency === 'weekly' ? 'week' : 'day'))
</script>

<style scoped>
/* Status colour as an accent along the top edge (E2E tests read this border) */
.habit-card {
  border-top: 4px solid var(--habit-colour) !important;
  box-shadow: var(--fb-shadow-sm);
}
@media (hover: hover) and (pointer: fine) {
  .habit-card {
    transition: transform var(--dur-ui) var(--ease-out), box-shadow var(--dur-ui) var(--ease-out);
  }
  .habit-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--fb-shadow-md);
  }
}
.habit-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 0.75rem;
  display: grid;
  place-items: center;
  font-size: 1.6rem;
  line-height: 1;
  /* the status colour at ~12% opacity */
  background: color-mix(in srgb, var(--habit-colour) 12%, var(--fb-surface));
}
.status-label {
  display: inline-flex;
  align-items: center;
  gap: var(--s-1);
  margin-top: var(--s-1);
  color: var(--fb-text-2);
}
.status-dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background-color: var(--habit-colour);
}
.min-w-0 {
  min-width: 0;
}
.habit-title {
  font-size: var(--fs-lg);
  font-weight: 600;
}
.streak-number {
  font-size: 1.9rem;
}
.habit-progress-bar {
  width: 100%;
  background-color: var(--habit-colour);
  transform-origin: left;
  transition: transform 500ms var(--ease-out), background-color 300ms ease;
}
/* The check pops in once when a habit is completed */
.done-check {
  display: inline-block;
  animation: check-pop 360ms var(--ease-out) backwards;
}
@keyframes check-pop {
  from { opacity: 0; transform: scale(0.5); }
  60% { opacity: 1; transform: scale(1.15); }
  to { transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .habit-progress-bar { transition: none; }
}
.streak-flame {
  color: var(--fb-amber);
}
/* Theme text on a tint of the status colour (mixed with the surface, so it
   stays readable in light and dark mode, on amber as well as green and grey). */
.btn-log {
  color: var(--fb-dark);
  border: 2px solid var(--habit-colour);
  background: transparent;
  font-weight: 600;
  border-radius: var(--r-md);
}
.btn-log:hover:not(:disabled),
.is-done .btn-log {
  color: var(--fb-dark);
  background-color: color-mix(in srgb, var(--habit-colour) 22%, var(--fb-surface));
}
</style>
