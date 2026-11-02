<!--
  Achievements: every badge in the catalogue, earned ones first.
  Badges are worked out on the server from the check-in history (nothing is
  stored), so this page only has to fetch and display them.
-->
<template>
  <div class="container py-4 py-md-5" style="max-width: 880px;">
    <header class="d-flex justify-content-between align-items-end flex-wrap gap-3 mb-4">
      <div>
        <h1 class="page-title">Achievements</h1>
        <p class="page-subtitle" data-testid="achievements-summary">{{ summary }}</p>
      </div>
      <button type="button" class="btn btn-sm btn-tinted px-3" :disabled="loading" @click="load">
        <i class="bi bi-arrow-clockwise me-1" :class="{ spin: loading }" aria-hidden="true"></i>Refresh
      </button>
    </header>

    <div v-if="error" class="alert alert-danger d-flex align-items-center" role="alert">
      <i class="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>{{ error }}
    </div>

    <div v-if="loading && !loaded" class="d-grid gap-3" aria-busy="true">
      <div class="skeleton" style="height: 90px"></div>
      <div class="skeleton" style="height: 240px"></div>
    </div>

    <div v-else-if="loaded" class="d-grid gap-4">
      <!-- Overall progress -->
      <section class="surface p-3 px-md-4" data-testid="achievements-progress">
        <div class="d-flex justify-content-between align-items-baseline mb-2">
          <h2 class="section-title mb-0">Your collection</h2>
          <span class="fw-semibold">{{ earned }} / {{ total }}</span>
        </div>
        <div class="progress" style="height: 0.6rem" role="progressbar"
          aria-label="Badges earned" :aria-valuenow="earned" aria-valuemin="0" :aria-valuemax="total">
          <div class="progress-bar bg-success" :style="{ width: earnedPercent + '%' }"></div>
        </div>

        <!-- The four numbers every badge is measured against -->
        <div class="row g-3 mt-1">
          <div v-for="stat in statCards" :key="stat.label" class="col-6 col-md-3">
            <div class="stat-tile">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Badges, earned first -->
      <section class="surface p-3 px-md-4">
        <h2 class="section-title mb-3">Badges</h2>
        <div class="row g-3">
          <div v-for="badge in sortedBadges" :key="badge.id" class="col-12 col-sm-6">
            <div class="badge-card h-100" :class="{ earned: badge.earned }" :data-testid="`badge-${badge.id}`">
              <div class="d-flex align-items-start gap-3">
                <span class="badge-icon" :class="{ locked: !badge.earned }" aria-hidden="true">{{ badge.icon }}</span>
                <div class="flex-grow-1" style="min-width: 0">
                  <div class="d-flex align-items-center gap-2">
                    <span class="fw-semibold">{{ badge.name }}</span>
                    <i v-if="badge.earned" class="bi bi-check-circle-fill text-success" aria-hidden="true"></i>
                  </div>
                  <p class="text-muted small mb-2">{{ badge.description }}</p>

                  <!-- Locked badges show how far along you are -->
                  <template v-if="!badge.earned">
                    <div class="progress" style="height: 0.35rem">
                      <div class="progress-bar" :style="{ width: badge.percent + '%' }"></div>
                    </div>
                    <div class="text-muted mt-1" style="font-size: 12px">
                      {{ badge.value }} / {{ badge.target }}
                    </div>
                  </template>
                  <div v-else class="text-success fw-semibold" style="font-size: 12px">Earned</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { achievementService } from '../services/achievementService'
import { errorMessage } from '../services/habitService'
import { toDateKey } from '../utils/dates'

const badges = ref([])
const stats = ref(null)
const earned = ref(0)
const total = ref(0)
const loading = ref(false)
const loaded = ref(false)
const error = ref('')

const earnedPercent = computed(() => (total.value === 0 ? 0 : Math.round((earned.value / total.value) * 100)))

const summary = computed(() => {
  if (!loaded.value) return 'Loading your badges…'
  if (earned.value === 0) return 'No badges yet — check in a habit to earn your first one.'
  if (earned.value === total.value) return 'Every badge earned. Nothing left to collect!'
  return `${earned.value} of ${total.value} badges earned`
})

// Earned badges first, then the closest ones to being earned
const sortedBadges = computed(() =>
  [...badges.value].sort((a, b) => {
    if (a.earned !== b.earned) return a.earned ? -1 : 1
    return b.percent - a.percent
  })
)

const statCards = computed(() => {
  if (!stats.value) return []
  return [
    { label: 'Habit days', value: stats.value.completions },
    { label: 'Perfect days', value: stats.value.perfectDays },
    { label: 'Best streak', value: stats.value.longestStreak },
    { label: 'Total points', value: stats.value.totalPoints },
  ]
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await achievementService.list(toDateKey())
    badges.value = data.badges
    stats.value = data.stats
    earned.value = data.earned
    total.value = data.total
    loaded.value = true
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.stat-tile {
  background: var(--fb-bg);
  border-radius: var(--r-md);
  padding: 0.75rem;
  text-align: center;
}
.stat-value {
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.1;
}
.stat-label {
  font-size: 12px;
  color: var(--fb-text-2);
}
.badge-card {
  border: 1px solid var(--fb-hairline);
  border-radius: var(--r-md);
  padding: 0.9rem;
  background: var(--fb-surface);
}
.badge-card.earned {
  border-color: var(--fb-green-600);
  background: color-mix(in srgb, var(--fb-green-600) 7%, var(--fb-surface));
}
.badge-icon {
  font-size: 1.9rem;
  line-height: 1;
}
/* Locked badges are greyed out so earned ones stand out at a glance */
.badge-icon.locked {
  filter: grayscale(1);
  opacity: 0.45;
}
.spin {
  animation: spin 800ms linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
  .spin { animation: none; }
}
</style>
