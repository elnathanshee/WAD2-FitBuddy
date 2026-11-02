<template>
  <div class="container py-4 py-md-5">
    <div class="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4">
      <div>
        <h1 class="page-title">My habits</h1>
        <p class="page-subtitle">{{ todayLabel }}</p>
      </div>
      <button type="button" class="btn btn-primary px-4" data-testid="add-habit-btn" @click="openCreate">
        <i class="bi bi-plus-lg me-1" aria-hidden="true"></i>New habit
      </button>
    </div>

    <div
      v-if="celebrating"
      class="alert alert-success d-flex align-items-center gap-2 fw-semibold celebration-banner"
      role="status"
      data-testid="celebration-banner"
    >
      <span class="fs-4" aria-hidden="true">🎉</span>
      All habits done for today! Great work.
    </div>

    <div v-if="actionError" class="alert alert-danger alert-dismissible" role="alert">
      {{ actionError }}
      <button type="button" class="btn-close" aria-label="Close" @click="actionError = ''"></button>
    </div>

    <div v-if="loading" class="row g-3" aria-busy="true">
      <span class="visually-hidden">Loading habits…</span>
      <div v-for="n in 3" :key="n" class="col-12 col-md-6 col-xl-4"><div class="skeleton" style="height: 230px"></div></div>
    </div>

    <div v-else-if="loadError" class="alert alert-danger d-flex align-items-center justify-content-between gap-3" role="alert">
      <span><i class="bi bi-wifi-off me-2" aria-hidden="true"></i>{{ loadError }}</span>
      <button type="button" class="btn btn-sm btn-outline-danger" @click="loadHabits">Try again</button>
    </div>

    <div v-else-if="habits.length === 0" class="surface text-center p-5">
      <span class="icon-tile mx-auto mb-3" style="width: 56px; height: 56px; font-size: 1.6rem">
        <i class="bi bi-chat-square-text text-primary" aria-hidden="true"></i>
      </span>
      <h2 class="h4 fw-bold">No habits yet</h2>
      <p class="text-muted">Start small: one habit you can do every day.</p>
      <div class="d-flex justify-content-center gap-2 flex-wrap">
        <button type="button" class="btn btn-outline-primary px-4" @click="coachRef?.openChat()">
          <i class="bi bi-chat-square-text me-1" aria-hidden="true"></i>Ask the coach
        </button>
        <button type="button" class="btn btn-primary px-4" @click="openCreate">
          Create your first habit
        </button>
      </div>
    </div>

    <template v-else>
      <div class="surface p-3 px-md-4 mb-4 d-flex align-items-center gap-3">
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between fw-semibold">
            <span>{{ doneToday }} of {{ habits.length }} habits done</span>
            <span class="text-muted tabular">{{ Math.round((doneToday / habits.length) * 100) }}%</span>
          </div>
          <div class="progress mt-2" style="height: 0.5rem" role="progressbar"
            aria-label="Habits done today" :aria-valuenow="doneToday" aria-valuemin="0" :aria-valuemax="habits.length">
            <div class="progress-bar overall-bar" :style="{ transform: `scaleX(${doneToday / habits.length})` }"></div>
          </div>
        </div>
        <i v-if="doneToday === habits.length" class="bi bi-emoji-sunglasses fs-2 text-primary" aria-label="All done"></i>
      </div>
      <div v-if="doneToday < habits.length" class="alert alert-light border d-flex align-items-start gap-3 mb-4" role="status">
        <i class="bi bi-heart-pulse text-success fs-4" aria-hidden="true"></i>
        <div><strong>A gentle reset for today</strong><p class="small text-muted mb-2">{{ doneToday ? 'You have already made a start. Pick one small habit to continue; there is no need to catch up all at once.' : 'A fresh start can be one small step. Choose the easiest habit and build from there.' }}</p><button v-if="habits.length" class="btn btn-sm btn-outline-success" @click="loggingHabit = nextUnfinishedHabit">Continue with {{ nextUnfinishedHabit?.name }}</button></div>
      </div>

      <div class="row g-3 stagger">
        <div v-for="habit in habits" :key="habit._id" class="col-12 col-md-6 col-xl-4">
          <HabitCard
            :habit="habit"
            @log="loggingHabit = habit"
            @history="historyHabit = habit"
            @edit="openEdit"
            @delete="deletingHabit = habit"
          />
        </div>
      </div>
    </template>

    <HabitFormModal v-if="formOpen" :habit="editingHabit" @saved="onSaved" @close="formOpen = false" />

    <LogProgressModal v-if="loggingHabit" :habit="loggingHabit" @logged="onLogged" @close="loggingHabit = null" />

    <HabitHistoryModal v-if="historyHabit" :habit="historyHabit" @close="historyHabit = null" />

    <!-- Undo bar: shown for a few seconds after logging, in case of a mis-tap.
         Beyond WAD2 syllabus: <Teleport> keeps the bar fixed above everything else on the
         page, and <Transition> plays the slide-out when it disappears (CSS alone cannot
         animate an element that Vue has already removed). -->
    <Teleport to="body">
      <Transition name="undo">
        <div v-if="lastLog" class="undo-bar" role="status" data-testid="undo-bar">
          <span class="text-truncate"><strong>{{ lastLog.habitName }}:</strong> {{ lastLog.summary }}</span>
          <button type="button" class="btn btn-sm undo-btn" :disabled="undoing" data-testid="undo-log-btn" @click="undoLastLog">
            <span v-if="undoing" class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
            <i v-else class="bi bi-arrow-counterclockwise me-1" aria-hidden="true"></i>Undo
          </button>
        </div>
      </Transition>
    </Teleport>

    <!-- Floating AI goal coach (bottom-right).
         Beyond WAD2 syllabus: the template ref lets the "Ask the coach" button call the
         chat's openChat(). Section 3 will replace this with a prop. -->
    <CoachChat ref="coachRef" @saved="loadHabits" />

    <AppModal v-if="deletingHabit" title="Delete habit?" @close="deletingHabit = null">
      <p class="mb-0">
        <strong>{{ deletingHabit.name }}</strong> and all of its check-in history will be deleted.
        This can't be undone.
      </p>
      <template #footer>
        <button type="button" class="btn btn-outline-secondary" @click="deletingHabit = null">Cancel</button>
        <button
          type="button"
          class="btn btn-danger"
          :disabled="deleting"
          data-testid="confirm-delete-btn"
          @click="confirmDelete"
        >
          <span v-if="deleting" class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
          Delete
        </button>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import HabitCard from '../components/habits/HabitCard.vue'
import HabitFormModal from '../components/habits/HabitFormModal.vue'
import LogProgressModal from '../components/habits/LogProgressModal.vue'
import HabitHistoryModal from '../components/habits/HabitHistoryModal.vue'
import AppModal from '../components/habits/AppModal.vue'
import CoachChat from '../components/habits/CoachChat.vue'
import { habitService, errorMessage } from '../services/habitService'
import { toDateKey } from '../utils/dates'
import { celebrate } from '../utils/celebrate'

const habits = ref([])
const coachRef = ref(null)
const loading = ref(true)
const loadError = ref('')
const actionError = ref('')
const loadedDate = ref(toDateKey()) // the day the numbers on screen are for
const celebrating = ref(false)

const formOpen = ref(false)
const editingHabit = ref(null) // null → the form creates a new habit
const loggingHabit = ref(null)
const historyHabit = ref(null)
const deletingHabit = ref(null)
const deleting = ref(false)

const todayLabel = computed(() =>
  new Date(`${loadedDate.value}T12:00`).toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long',
  })
)

// Done = target reached for its period: today (daily) or this week (weekly)
const doneToday = computed(
  () => habits.value.filter((h) => h.periodCount >= h.target.amount).length
)
// The first habit that hasn't reached its target yet (used by "Continue with ...")
const nextUnfinishedHabit = computed(
  () => habits.value.find((h) => h.periodCount < h.target.amount)
)
const allDone = computed(() => habits.value.length > 0 && doneToday.value === habits.value.length)

// Reloads every habit with today's progress and streak. Called after each
// change, so the numbers on screen always come from the server.
async function loadHabits() {
  loadError.value = ''
  const today = toDateKey()
  try {
    habits.value = await habitService.list(today)
    loadedDate.value = today
  } catch (err) {
    loadError.value = errorMessage(err)
  } finally {
    loading.value = false
  }
}

// Daily reset: progress is stored per day, so a new day starts at 0 on the
// server automatically. This makes an open page catch up too — it reloads when
// the date changes (checked every minute) or when the user comes back to the tab.
function reloadIfNewDay() {
  if (toDateKey() !== loadedDate.value) loadHabits()
}
function onVisibilityChange() {
  if (document.visibilityState === 'visible') reloadIfNewDay()
}
let dayTimer = null

onMounted(() => {
  loadHabits()
  dayTimer = setInterval(reloadIfNewDay, 60_000)
  document.addEventListener('visibilitychange', onVisibilityChange)
})
// Beyond WAD2 syllabus: onUnmounted cleans up when the user leaves this page.
// Without it the day-check timer, the other timers and the visibilitychange listener
// would keep running in the background after the page is gone.
onUnmounted(() => {
  clearInterval(dayTimer)
  clearTimeout(celebrationTimer)
  clearTimeout(undoTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

function openCreate() {
  editingHabit.value = null
  formOpen.value = true
}

function openEdit(habit) {
  editingHabit.value = habit
  formOpen.value = true
}

async function onSaved() {
  formOpen.value = false
  await loadHabits()
}

// After logging: refresh, offer Undo, and celebrate if that log finished the
// LAST habit (only on the change from "not all done" to "all done").
let celebrationTimer = null
async function onLogged(change) {
  const wasAllDone = allDone.value
  loggingHabit.value = null
  if (change) showUndo(change)
  await loadHabits()
  if (!wasAllDone && allDone.value) {
    celebrate()
    celebrating.value = true
    clearTimeout(celebrationTimer)
  clearTimeout(undoTimer)
    celebrationTimer = setTimeout(() => (celebrating.value = false), 6000)
  }
}

// ---- Undo the last log ----------------------------------------------------
// Puts today's amount back to what it was before the last change.
const lastLog = ref(null)
const undoing = ref(false)
let undoTimer = null

function showUndo(change) {
  lastLog.value = change
  clearTimeout(undoTimer)
  undoTimer = setTimeout(() => (lastLog.value = null), 8000)
}

async function undoLastLog() {
  const change = lastLog.value
  if (!change) return
  undoing.value = true
  actionError.value = ''
  try {
    await habitService.setTotal(change.habitId, change.date, change.previousTotal)
    clearTimeout(undoTimer)
    lastLog.value = null
    await loadHabits()
  } catch (err) {
    actionError.value = errorMessage(err)
  } finally {
    undoing.value = false
  }
}

async function confirmDelete() {
  deleting.value = true
  actionError.value = ''
  try {
    await habitService.remove(deletingHabit.value._id)
    deletingHabit.value = null
    await loadHabits()
  } catch (err) {
    actionError.value = errorMessage(err)
    deletingHabit.value = null
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
/* Undo bar: bottom-centre, enters from below and leaves the same way */
.undo-bar {
  position: fixed;
  left: 50%;
  bottom: var(--s-6);
  z-index: 1045;
  display: flex;
  align-items: center;
  gap: var(--s-4);
  max-width: min(480px, calc(100vw - 2 * var(--s-4) - 76px)); /* leaves room for the coach button */
  padding: var(--s-2) var(--s-2) var(--s-2) var(--s-4);
  border-radius: var(--r-lg);
  color: #f5f3ee;
  background: rgba(28, 27, 24, 0.94);
  box-shadow: var(--fb-shadow-lg);
  font-size: var(--fs-sm);
  transform: translateX(-50%);
}
.undo-btn {
  flex-shrink: 0;
  color: #f5f3ee;
  border: 1px solid rgba(245, 243, 238, 0.3);
}
.undo-btn:hover {
  color: #fff;
  background: rgba(245, 243, 238, 0.12);
}
.undo-enter-active {
  transition: opacity 200ms var(--ease-out), transform 240ms var(--ease-out);
}
.undo-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}
.undo-enter-from,
.undo-leave-to {
  opacity: 0;
  transform: translate(-50%, 16px);
}
@media (max-width: 575.98px) {
  .undo-bar {
    left: var(--s-4);
    transform: none;
    max-width: calc(100vw - 2 * var(--s-4) - 76px);
  }
  .undo-enter-from,
  .undo-leave-to {
    transform: translateY(16px);
  }
}
.overall-bar {
  width: 100%;
  transform-origin: left;
  transition: transform 500ms var(--ease-out);
}
.celebration-banner {
  animation: pop-in 0.4s ease-out;
}
@keyframes pop-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .celebration-banner { animation: none; }
  .overall-bar { transition: none; }
}
</style>
