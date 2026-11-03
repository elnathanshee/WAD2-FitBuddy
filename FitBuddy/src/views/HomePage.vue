<!--
  Home: the first page after login. A quick read of today: habit progress,
  day-ending notification banner, habit groups, and simulated Google Health activity.
  Deeper stats live on the Dashboard; managing habits lives on the Habits page.
-->
<template>
  <div class="container py-4 py-md-5 home">
    <!-- Greeting, today's progress, and the 3D streak medal (the page's focal point) -->
    <header class="hero mb-4 mb-md-5" data-testid="home-hero">
      <div class="hero-text min-w-0">
        <div class="eyebrow mb-2">{{ todayLabel }}</div>
        <h1 class="hero-title">{{ greeting }}, {{ firstName }}</h1>
        <p class="page-subtitle mb-4">{{ summary }}</p>
        <div class="today" role="img" :aria-label="`${doneCount} of ${habits.length} habits done today`">
          <div class="today-count display-num">
            <span data-testid="home-done-count">{{ doneCount }}/{{ habits.length }}</span>
            <small>done today</small>
          </div>
          <div class="today-bar"><span :style="{ transform: `scaleX(${todayRatio})` }"></span></div>
        </div>
      </div>
      <div class="hero-medal">
        <StreakMedal3D :value="currentStreak.current" label="day streak" />
        <div class="medal-caption">
          <span class="eyebrow">Current streak</span>
          <span class="fw-bold" data-testid="home-current-streak">{{ currentStreak.current }} day{{ currentStreak.current === 1 ? '' : 's' }}</span>
          <span class="text-muted small">In a row with all daily habits done</span>
          <span class="text-muted small">High score: {{ currentStreak.longest }}</span>
        </div>
      </div>
    </header>

    <!-- Day-ending / time running out alert banner -->
    <DayEndingBanner :habits="habits" />

    <!-- Auto-scrolling highlights -->
    <div class="mb-4 mb-md-5">
      <div v-if="!highlights.length" class="d-flex gap-3 overflow-hidden" aria-busy="true">
        <div v-for="n in 3" :key="n" class="skeleton flex-shrink-0" style="height: 184px; width: min(85%, 360px)"></div>
      </div>
      <HighlightsCarousel v-else label="Your highlights" :slides="highlights" />
    </div>

    <div class="row g-4">
      <div class="col-12 col-lg-8 d-flex flex-column gap-4">
        <!-- Today's habits -->
        <section v-reveal class="surface p-4" data-testid="home-habits">
          <div class="section-head">
            <div>
              <h2 class="section-title">Today's habits</h2>
              <div class="text-muted small">Your progress so far</div>
            </div>
            <router-link to="/habits" class="btn btn-sm btn-tinted px-3">
              Manage<i class="bi bi-chevron-right ms-1" aria-hidden="true"></i>
            </router-link>
          </div>

          <div v-if="loading" class="d-grid gap-2">
            <div v-for="n in 3" :key="n" class="skeleton" style="height: 64px"></div>
          </div>

          <div v-else-if="loadError" class="d-flex align-items-center justify-content-between gap-3 text-danger small" role="alert">
            <span><i class="bi bi-wifi-off me-2" aria-hidden="true"></i>{{ loadError }}</span>
            <button type="button" class="btn btn-sm btn-outline-danger" @click="loadHabits">Try again</button>
          </div>

          <div v-else-if="habits.length === 0" class="text-center py-4">
            <p class="text-muted mb-3">No habits yet. The coach on the Habits page can suggest a few to start with.</p>
            <router-link to="/habits" class="btn btn-sm btn-primary px-3">Go to Habits</router-link>
          </div>

          <ul v-else class="habit-list divided list-unstyled mb-0">
            <li v-for="habit in habits" :key="habit._id">
              <router-link
                to="/habits"
                class="habit-row pressable"
                :style="{ '--status': STATUS[habitStatus(habit)].colour }"
                data-testid="home-habit-row"
              >
                <span class="habit-emoji" aria-hidden="true">{{ habit.icon }}</span>
                <span class="habit-main">
                  <span class="d-flex justify-content-between gap-2">
                    <span class="habit-name">{{ habit.name }}</span>
                    <span class="habit-amount tabular">
                      {{ formatAmount(habit.periodCount) }}/{{ formatAmount(habit.target.amount) }}
                      <span class="text-muted">{{ habit.target.unit }}</span>
                    </span>
                  </span>
                  <span class="bar"><span :style="{ transform: `scaleX(${ready ? share(habit) : 0})` }"></span></span>
                  <span class="habit-meta">
                    <span>
                      {{ periodLabel(habit) }}
                      <template v-if="habit.frequency === 'weekly' && habit.customDays?.length">
                        ({{ habit.customDays.join(', ') }})
                      </template>
                      · {{ STATUS[habitStatus(habit)].label }}
                    </span>
                    <span v-if="habit.streak.current" class="streak">
                      <i class="bi bi-fire" aria-hidden="true"></i>{{ habit.streak.current }}
                    </span>
                  </span>
                </span>
              </router-link>
            </li>
          </ul>
        </section>

        <!-- Habit groups (replaces active challenges on the Home page) -->
        <!-- flex-grow-1: stretches so the left column's bottom lines up with Google Health -->
        <GroupsSection v-reveal class="flex-grow-1" @checked-in="onSynced" />
      </div>

      <!-- Google Health (Simulated) -->
      <div class="col-12 col-lg-4">
        <!-- h-100: spans the full height of the two cards beside it -->
        <FitnessTrackerWidget
          v-reveal="80"
          class="h-100"
          :habits-count="habits.length"
          :completed-today="doneCount"
          @synced="onSynced"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import GroupsSection from '../components/dashboard/GroupsSection.vue'
import FitnessTrackerWidget from '../components/dashboard/FitnessTrackerWidget.vue'
import DayEndingBanner from '../components/notifications/DayEndingBanner.vue'
import HighlightsCarousel from '../components/HighlightsCarousel.vue'
import StreakMedal3D from '../components/three/StreakMedal3D.vue'
import { useAuthStore } from '../stores/auth'
import { habitService, errorMessage } from '../services/habitService'
import { analyticsService } from '../services/analyticsService'
import { leaderboardService } from '../services/leaderboardService'
import { toDateKey } from '../utils/dates'
import { CATEGORIES, formatAmount, habitStatus, periodLabel, STATUS } from '../utils/habitOptions'

const auth = useAuthStore()
const firstName = (auth.user?.name || 'Athlete').split(' ')[0]

const habits = ref([])
const loading = ref(true)
const loadError = ref('')
const ready = ref(false) // flips after first paint so the bars animate from 0

const hour = new Date().getHours()
const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
const todayLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

// Done = target reached for its period (today, or this week for weekly habits)
const doneCount = computed(() => habits.value.filter((h) => habitStatus(h) === 'completed').length)

const summary = computed(() => {
  if (loading.value) return 'Loading your day…'
  if (!habits.value.length) return 'Add a habit to start building your streaks.'
  const left = habits.value.length - doneCount.value
  const days = currentStreak.value.current
  const streakText = days ? ` · Current streak: ${days} day${days === 1 ? '' : 's'}` : ''
  return left === 0 ? `Everything's done for today. Nice work!${streakText}` : `${left} habit${left === 1 ? '' : 's'} to go today${streakText}`
})

const todayRatio = computed(() =>
  ready.value && habits.value.length ? doneCount.value / habits.value.length : 0,
)

// ---- Highlights carousel ----------------------------------------------------
// Built from this month's analytics and this week's leaderboard. Each slide
// links to the page with the details.
const month = ref(null)
const week = ref(null)
const weeklyRecap = ref(null)

// Current streak = days in a row with every daily habit done (same as the Dashboard)
const currentStreak = computed(() => month.value?.perfectDayStreak ?? { current: 0, longest: 0 })

const categoryLabel = (value) => CATEGORIES.find((c) => c.value === value && value !== 'other')?.label ?? value

const highlights = computed(() => {
  if (!month.value || !week.value) return []
  const slides = []
  const me = week.value.entries.find((e) => e.isCurrentUser)
  if (me) {
    slides.push({
      id: 'points', tone: 'green', icon: 'bi-trophy', eyebrow: 'Points this week',
      value: me.points, unit: 'pts', caption: `Rank ${me.rank} of ${week.value.entries.length} on the leaderboard`,
      to: '/leaderboard', linkLabel: 'See the leaderboard',
    })
  }
  const streak = currentStreak.value
  slides.push({
    id: 'current-streak', tone: 'amber', icon: 'bi-fire', eyebrow: 'Current streak',
    value: streak.current, unit: streak.current === 1 ? 'day' : 'days',
    caption: 'In a row with all daily habits done',
    note: `High score: ${streak.longest}`,
    to: '/dashboard', linkLabel: 'View your stats',
  })
  const sm = month.value.summary
  if (weeklyRecap.value?.summary?.completionRate !== null && weeklyRecap.value?.summary?.completionRate !== undefined) {
    const recap = weeklyRecap.value.summary
    slides.push({
      id: 'weekly-recap', tone: 'blue', icon: 'bi-calendar-week', eyebrow: 'Your week at a glance',
      value: recap.completionRate ?? 0, unit: '%',
      caption: `${recap.done} of ${recap.due} habit targets met · ${recap.checkIns} check-ins`,
      note: recap.change === null ? 'Every small step counts.' : `${recap.change >= 0 ? 'Up' : 'Down'} ${Math.abs(recap.change)}% from last week`,
      to: '/dashboard', linkLabel: 'View weekly details',
    })
  }
  if (sm.completionRate !== null) {
    slides.push({
      id: 'rate', tone: 'blue', icon: 'bi-graph-up-arrow', eyebrow: 'This month',
      value: sm.completionRate, unit: '%',
      caption: sm.change === null ? `${sm.done} of ${sm.due} targets met` : `${sm.change >= 0 ? 'Up' : 'Down'} ${Math.abs(sm.change)}% on last month`,
      to: '/dashboard', linkLabel: 'View your stats',
    })
  }
  slides.push({
    id: 'total-completed', tone: 'purple', icon: 'bi-check2-all', eyebrow: 'Total habits completed',
    value: sm.done, caption: 'Times you hit a habit\'s target this month',
    to: '/dashboard', linkLabel: 'See the calendar',
  })
  const top = Object.entries(month.value.categories).sort((a, b) => b[1] - a[1])[0]
  if (top) {
    slides.push({
      id: 'top-category', tone: 'coral', icon: 'bi-bullseye', eyebrow: 'Most logged',
      value: categoryLabel(top[0]), caption: `${top[1]} times this month`,
      to: '/habits', linkLabel: 'Go to habits',
    })
  }
  return slides
})

async function loadHighlights() {
  const today = toDateKey()
  try {
    const [m, w, recap] = await Promise.all([analyticsService.getSummary('month', 0), leaderboardService.weekly(today), analyticsService.getSummary('week', 0)])
    month.value = m
    week.value = w
    weeklyRecap.value = recap
  } catch (err) {
    console.warn('Could not load highlights:', err)
  }
}

function onSynced() {
  loadHabits()
  loadHighlights()
}

const share = (habit) => Math.min(1, habit.periodCount / habit.target.amount)

async function loadHabits() {
  loadError.value = ''
  try {
    habits.value = await habitService.list(toDateKey())
  } catch (err) {
    loadError.value = errorMessage(err)
  } finally {
    loading.value = false
  }
  if (!ready.value) {
    // Beyond WAD2 syllabus: nextTick + requestAnimationFrame wait until the bars
    // have been drawn at 0% before we set ready, so the CSS transition can then
    // grow them to their real length. Setting ready straight away would skip the animation.
    await nextTick()
    requestAnimationFrame(() => (ready.value = true))
  }
}

onMounted(() => {
  loadHabits()
  loadHighlights()
})
</script>

<style scoped>
/* Hero sits on the page background (not in a card); the medal is its focal point */
.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-6);
  padding-bottom: var(--s-6);
  border-bottom: 1px solid var(--fb-hairline);
}
.hero-title {
  font-size: clamp(var(--fs-3xl), 6vw, var(--fs-4xl));
  font-weight: 600;
  line-height: 1.05;
  letter-spacing: -0.015em;
  margin-bottom: var(--s-2);
}
.min-w-0 {
  min-width: 0;
}
.today {
  max-width: 360px;
}
.today-count {
  display: flex;
  align-items: baseline;
  gap: var(--s-2);
  font-size: var(--fs-2xl);
  margin-bottom: var(--s-2);
}
.today-count small {
  font-family: var(--font-body);
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--fb-text-2);
}
.today-bar {
  height: 8px;
  border-radius: 999px;
  background: var(--fb-hairline);
  overflow: hidden;
}
.today-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--fb-green-500);
  transform-origin: left;
  transition: transform 700ms var(--ease-out);
}
.hero-medal {
  display: flex;
  align-items: center;
  gap: var(--s-4);
  flex-shrink: 0;
}
.medal-caption {
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
  max-width: 160px;
}

/* Habit rows: separated by hairlines, no inner boxes */
.habit-row {
  display: flex;
  align-items: center;
  gap: var(--s-4);
  padding: var(--s-4) var(--s-1);
  color: inherit;
  text-decoration: none;
}
.habit-list > li:first-child .habit-row {
  padding-top: var(--s-1);
}
.habit-list > li:last-child .habit-row {
  padding-bottom: 0;
}
@media (hover: hover) and (pointer: fine) {
  .habit-row {
    transition: transform var(--dur-press) var(--ease-out);
  }
  .habit-row:hover .habit-name {
    color: var(--fb-green-700);
  }
}
.habit-emoji {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  border-radius: var(--r-md);
  background: color-mix(in srgb, var(--status) 14%, var(--fb-surface));
}
.habit-main {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  flex-grow: 1;
  min-width: 0;
}
.habit-name {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 150ms ease;
}
.habit-amount {
  font-size: 0.88rem;
  font-weight: 600;
  white-space: nowrap;
}
.habit-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  color: var(--fb-text-2);
}
.streak {
  color: var(--fb-amber-text);
  font-weight: 700;
  display: inline-flex;
  gap: 2px;
}
.bar {
  display: block;
  height: 6px;
  border-radius: 999px;
  background: var(--fb-hairline);
  overflow: hidden;
}
.bar > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--status);
  transform-origin: left;
  transition: transform 600ms var(--ease-out);
}

@media (max-width: 767.98px) {
  .hero {
    flex-direction: column;
    align-items: stretch;
  }
  .hero-medal {
    justify-content: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .today-bar span,
  .bar > span {
    transition: none;
  }
}
</style>
