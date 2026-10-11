<template>
  <div class="container py-4 py-md-5">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
      <div>
        <h1 class="h2 fw-bold mb-1">My habits</h1>
        <p class="text-muted mb-0">{{ todayLabel }}</p>
      </div>
      <button type="button" class="btn btn-primary rounded-pill px-4" data-testid="add-habit-btn" @click="openCreate">
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

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading habits…</span>
      </div>
    </div>

    <div v-else-if="loadError" class="alert alert-danger d-flex align-items-center justify-content-between gap-3" role="alert">
      <span><i class="bi bi-wifi-off me-2" aria-hidden="true"></i>{{ loadError }}</span>
      <button type="button" class="btn btn-sm btn-outline-danger" @click="loadHabits">Try again</button>
    </div>

    <div v-else-if="habits.length === 0" class="card border-0 shadow-sm text-center p-5">
      <i class="bi bi-stars text-primary mb-3" style="font-size: 3rem" aria-hidden="true"></i>
      <h2 class="h4 fw-bold">No habits yet</h2>
      <p class="text-muted">Start small: one habit you can do every day.</p>
      <div>
        <button type="button" class="btn btn-primary rounded-pill px-4" @click="openCreate">
          Create your first habit
        </button>
      </div>
    </div>

    <template v-else>
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-body d-flex align-items-center gap-3">
          <div class="flex-grow-1">
            <div class="fw-semibold">
              {{ doneToday }} of {{ habits.length }} habits done
            </div>
            <div class="progress mt-2" style="height: 0.5rem" role="progressbar"
              aria-label="Habits done today" :aria-valuenow="doneToday" aria-valuemin="0" :aria-valuemax="habits.length">
              <div class="progress-bar bg-primary" :style="{ width: `${(doneToday / habits.length) * 100}%` }"></div>
            </div>
          </div>
          <i v-if="doneToday === habits.length" class="bi bi-emoji-sunglasses fs-2 text-primary" aria-label="All done"></i>
        </div>
      </div>

      <div class="row g-3">
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
import { habitService, errorMessage } from '../services/habitService'
import { toDateKey } from '../utils/dates'
import { celebrate } from '../utils/celebrate'

const habits = ref([])
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
onUnmounted(() => {
  clearInterval(dayTimer)
  clearTimeout(celebrationTimer)
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

// After logging: refresh, and celebrate if that log finished the LAST habit
// (only on the change from "not all done" to "all done", not on every reload).
let celebrationTimer = null
async function onLogged() {
  const wasAllDone = allDone.value
  loggingHabit.value = null
  await loadHabits()
  if (!wasAllDone && allDone.value) {
    celebrate()
    celebrating.value = true
    clearTimeout(celebrationTimer)
    celebrationTimer = setTimeout(() => (celebrating.value = false), 6000)
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
.celebration-banner {
  animation: pop-in 0.4s ease-out;
}
@keyframes pop-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .celebration-banner { animation: none; }
}
</style>
