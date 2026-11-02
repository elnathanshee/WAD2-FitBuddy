<!--
  A friend's profile: their week at a glance (completion rate, streak, points),
  a dot for each day of this week, and every habit with its progress and streak.
  Only friends can open it; anyone else gets a short "not friends yet" page.
-->
<template>
  <div class="container py-4 py-md-5" style="max-width: 880px;">
    <RouterLink to="/friends" class="back-link" data-testid="friend-back-link">
      <i class="bi bi-arrow-left me-1" aria-hidden="true"></i>Friends
    </RouterLink>

    <div v-if="loading" class="d-grid gap-3" aria-busy="true">
      <div class="skeleton" style="height: 130px"></div>
      <div class="skeleton" style="height: 90px"></div>
      <div class="skeleton" style="height: 220px"></div>
    </div>

    <!-- Not allowed / not found -->
    <section v-else-if="notice" class="surface p-4 p-md-5 text-center" data-testid="friend-notice">
      <i class="bi bi-person-lock d-block mb-2" style="font-size: 2rem; color: var(--fb-text-3)" aria-hidden="true"></i>
      <p class="fw-bold mb-1">{{ notice }}</p>
      <RouterLink to="/friends" class="btn btn-sm btn-tinted px-3 mt-2">Back to Friends</RouterLink>
    </section>

    <div v-else-if="error" class="alert alert-danger d-flex align-items-center" role="alert">
      <i class="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>{{ error }}
    </div>

    <div v-else-if="data" class="d-grid gap-4">
      <!-- Hero -->
      <section class="surface p-4 hero" data-testid="friend-hero">
        <span
          class="avatar"
          :style="{ width: '72px', height: '72px', backgroundColor: data.profile.avatarColor, fontSize: '2rem' }"
        >
          {{ data.profile.displayName.charAt(0).toUpperCase() }}
        </span>
        <div class="hero-text">
          <h1 class="page-title">{{ data.profile.displayName }}</h1>
          <p class="page-subtitle small" data-testid="friend-meta">{{ metaLine }}</p>
        </div>
        <button
          v-if="!isSelf"
          type="button"
          class="btn btn-sm btn-outline-danger"
          data-testid="friend-profile-remove-btn"
          @click="confirming = true"
        >
          <i class="bi bi-person-dash me-1" aria-hidden="true"></i>Remove friend
        </button>
      </section>

      <!-- Stat tiles -->
      <div class="row g-3" data-testid="friend-stats">
        <div v-for="tile in tiles" :key="tile.label" class="col-6 col-md-3">
          <div class="surface p-3 h-100" data-testid="friend-stat">
            <div class="eyebrow"><i class="bi me-1" :class="tile.icon" :style="{ color: tile.color }" aria-hidden="true"></i>{{ tile.label }}</div>
            <div class="display-num stat-value mt-2">{{ tile.value }}<small v-if="tile.unit">{{ tile.unit }}</small></div>
          </div>
        </div>
      </div>

      <!-- This week -->
      <section class="surface p-3 px-md-4">
        <h2 class="section-title mb-3">This week</h2>
        <div class="week-strip" data-testid="friend-week-strip">
          <div v-for="day in weekDays" :key="day.date" class="week-day">
            <span class="week-dot" :class="`dot-${day.state}`" :title="day.title" data-testid="friend-week-dot"></span>
            <span class="week-letter">{{ day.letter }}</span>
          </div>
        </div>
      </section>

      <!-- Habits -->
      <section class="surface p-3 px-md-4">
        <h2 class="section-title mb-2">Habits</h2>
        <p v-if="habits.length === 0" class="text-muted mb-0 py-2">
          {{ data.profile.displayName }} hasn't added any habits yet.
        </p>
        <ul v-else class="divided list-unstyled mb-0">
          <li v-for="h in habits" :key="h.id" class="habit-row" data-testid="friend-habit">
            <span class="icon-tile" aria-hidden="true">{{ h.icon }}</span>
            <div class="habit-info">
              <div class="fw-bold">{{ h.name }}</div>
              <div class="habit-sub">{{ h.frequency === 'weekly' ? 'Weekly' : 'Daily' }} · {{ h.target }} {{ h.unit }}</div>
              <div class="progress mt-2" style="height: 6px" role="progressbar" :aria-valuenow="h.percent" aria-valuemin="0" aria-valuemax="100">
                <div class="progress-bar" :style="{ width: `${h.percent}%` }"></div>
              </div>
            </div>
            <div class="habit-side">
              <div class="habit-progress">{{ h.progressText }}</div>
              <div v-if="h.streak.current > 0" class="habit-streak">
                <i class="bi bi-fire" aria-hidden="true"></i>{{ h.streak.current }}-{{ h.streak.unit === 'weeks' ? 'week' : 'day' }} streak
              </div>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <!-- Confirm removing this friend -->
    <AppModal v-if="confirming" :title="`Remove ${data.profile.displayName}?`" size="sm" @close="confirming = false">
      <p class="mb-0">You'll stop seeing each other's progress. You can send a new request any time.</p>
      <template #footer>
        <button type="button" class="btn btn-light" @click="confirming = false">Cancel</button>
        <button
          type="button"
          class="btn btn-danger"
          :disabled="removing"
          data-testid="confirm-remove-friend-btn"
          @click="removeFriend"
        >
          Remove
        </button>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { friendService } from '../services/friendService'
import { useAuthStore } from '../stores/auth'
import { errorMessage } from '../services/habitService'
import { toDateKey, fromDateKey } from '../utils/dates'
import AppModal from '../components/habits/AppModal.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const data = ref(null)
const loading = ref(true)
const error = ref('')
const notice = ref('') // friendly message for 403 / 404
const confirming = ref(false)
const removing = ref(false)

const isSelf = computed(() => String(auth.user?.id) === String(data.value?.profile.userId))

const fmt = (iso, options) => new Date(iso).toLocaleDateString(undefined, options)

const metaLine = computed(() => {
  const p = data.value.profile
  const parts = [`Member since ${fmt(p.memberSince, { month: 'short', year: 'numeric' })}`]
  if (p.friendsSince) parts.push(`Friends since ${fmt(p.friendsSince, { day: 'numeric', month: 'short' })}`)
  parts.push(`${p.friendsCount} ${p.friendsCount === 1 ? 'friend' : 'friends'}`)
  return parts.join(' · ')
})

const tiles = computed(() => {
  const { analytics, points } = data.value
  const rate = analytics.summary.completionRate
  const streak = analytics.perfectDayStreak.current
  return [
    { label: 'This week', icon: 'bi-bullseye', color: 'var(--fb-green-600)', value: rate ?? '—', unit: rate === null ? '' : '%' },
    { label: 'Perfect-day streak', icon: 'bi-fire', color: 'var(--fb-amber)', value: streak, unit: streak === 1 ? ' day' : ' days' },
    { label: 'Points', icon: 'bi-trophy-fill', color: 'var(--fb-blue)', value: points.total, unit: '' },
    { label: 'Active habits', icon: 'bi-check2-square', color: 'var(--fb-green-600)', value: analytics.summary.activeHabits, unit: '' },
  ]
})

// One dot per day, Monday to Sunday:
//   full = every habit due that day was done, partial = some were, missed = none,
//   none = nothing was due yet (or the day is still to come)
const weekDays = computed(() =>
  data.value.analytics.days.map((day) => {
    const date = fromDateKey(day.date)
    let state = 'none'
    let status = day.future ? 'upcoming' : 'nothing due'
    if (!day.future && day.due > 0) {
      state = day.done === day.due ? 'full' : day.done > 0 ? 'partial' : 'missed'
      status = `${day.done} of ${day.due} done`
    }
    return {
      date: day.date,
      state,
      letter: date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
      title: `${date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · ${status}`,
    }
  }),
)

// This week's progress per habit: days done for daily habits, the weekly total for weekly ones
const habits = computed(() =>
  data.value.analytics.habits.map((h) => {
    const weekly = h.frequency === 'weekly'
    const percent = weekly
      ? Math.min(100, Math.round((h.amount / h.target) * 100))
      : h.due > 0 ? Math.round((h.done / h.due) * 100) : 0
    const progressText = weekly ? `${h.amount} / ${h.target} ${h.unit}` : `${h.done} / ${h.due} days`
    return { ...h, percent, progressText }
  }),
)

async function load() {
  try {
    data.value = await friendService.profile(route.params.id, toDateKey())
  } catch (err) {
    const status = err.response?.status
    if (status === 403) notice.value = "You're not friends with this athlete yet."
    else if (status === 404) notice.value = "We couldn't find that athlete."
    else error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
}

async function removeFriend() {
  removing.value = true
  try {
    await friendService.remove(data.value.profile.userId)
    router.push('/friends')
  } catch (err) {
    confirming.value = false
    error.value = errorMessage(err)
    data.value = null
  } finally {
    removing.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.back-link {
  display: inline-flex;
  align-items: center;
  margin-bottom: var(--s-4);
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--fb-text-2);
  text-decoration: none;
}
.back-link:hover {
  color: var(--fb-text);
}

/* Hero */
.hero {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--s-4);
}
.hero-text {
  flex: 1 1 180px; /* on phones the Remove button wraps onto its own line */
  min-width: 0;
}

/* Stat tiles */
.stat-value {
  font-size: 2rem;
}
.stat-value small {
  font-family: var(--font-body);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--fb-text-2);
}

/* This week */
.week-strip {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--s-2);
}
.week-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-2);
}
.week-dot {
  width: 100%;
  max-width: 44px;
  aspect-ratio: 1;
  border-radius: 50%;
  border: 1px solid var(--fb-hairline);
}
.dot-full {
  background: var(--fb-green-600);
  border-color: var(--fb-green-600);
}
.dot-partial {
  background: var(--fb-green-200);
  border-color: var(--fb-green-200);
}
.dot-missed {
  background: var(--fb-surface);
}
.dot-none {
  background: var(--fb-surface-2);
}
.week-letter {
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--fb-text-2);
}

/* Habits */
.habit-row {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-3) 0;
}
.habit-info {
  flex: 1;
  min-width: 0;
}
.habit-sub {
  font-size: 0.8rem;
  color: var(--fb-text-2);
}
.habit-side {
  text-align: right;
  font-size: 0.8rem;
  flex-shrink: 0;
}
.habit-progress {
  font-weight: 700;
  color: var(--fb-text);
}
.habit-streak {
  color: var(--fb-amber-text);
  font-weight: 600;
}
.habit-streak i {
  color: var(--fb-amber);
  margin-right: 2px;
}
</style>
