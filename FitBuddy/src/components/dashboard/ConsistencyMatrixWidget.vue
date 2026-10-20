<template>
  <div class="card border-0 shadow-sm rounded-4 p-4 mb-4">
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
      <div>
        <h5 class="fw-bold mb-0 d-flex align-items-center gap-2">
          <i class="bi bi-bar-chart-line-fill text-primary"></i>
          <span>7-Day Habit Consistency & Analytics</span>
        </h5>
        <small class="text-muted">Daily completion tracking powered by Neon PostgreSQL</small>
      </div>
      <span class="badge rounded-pill text-bg-primary px-3 py-2 fs-6">
        {{ summary.overallCompletionRate }}% Weekly Rate
      </span>
    </div>

    <!-- 7-Day Visual Bars -->
    <div class="d-flex justify-content-between align-items-end pt-3 pb-2 px-2" style="height: 160px;">
      <div
        v-for="day in summary.days"
        :key="day.date"
        class="text-center d-flex flex-column align-items-center h-100 justify-content-end"
        style="width: 12%;"
      >
        <span class="small fw-bold text-muted mb-1" style="font-size: 11px;">{{ day.percentage }}%</span>
        <div
          class="w-100 rounded-3 transition-all"
          :class="barColorClass(day.percentage)"
          :style="{ height: Math.max(12, Math.round((day.percentage / 100) * 100)) + 'px', minHeight: '8px' }"
          :title="`${day.day}: ${day.completed}/${day.total} habits finished`"
        ></div>
        <span class="small fw-semibold mt-2 text-muted" style="font-size: 12px;">{{ day.day }}</span>
      </div>
    </div>

    <!-- Bottom summary row -->
    <div class="d-flex justify-content-around text-center pt-3 border-top mt-2">
      <div>
        <div class="fs-5 fw-bold text-dark">{{ summary.totalCheckIns }}</div>
        <small class="text-muted" style="font-size: 12px;">Check-ins (7 Days)</small>
      </div>
      <div>
        <div class="fs-5 fw-bold text-primary">{{ summary.activeHabitsCount }}</div>
        <small class="text-muted" style="font-size: 12px;">Active Habits</small>
      </div>
      <div>
        <div class="fs-5 fw-bold text-success">{{ summary.overallCompletionRate }}%</div>
        <small class="text-muted" style="font-size: 12px;">Consistency Score</small>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { analyticsService } from '../../services/analyticsService'

const summary = ref({
  days: [
    { date: '1', day: 'Mon', completed: 3, total: 3, percentage: 100 },
    { date: '2', day: 'Tue', completed: 2, total: 3, percentage: 67 },
    { date: '3', day: 'Wed', completed: 3, total: 3, percentage: 100 },
    { date: '4', day: 'Thu', completed: 1, total: 3, percentage: 33 },
    { date: '5', day: 'Fri', completed: 3, total: 3, percentage: 100 },
    { date: '6', day: 'Sat', completed: 2, total: 3, percentage: 67 },
    { date: '7', day: 'Sun', completed: 3, total: 3, percentage: 100 },
  ],
  overallCompletionRate: 81,
  totalCheckIns: 17,
  activeHabitsCount: 3,
})

function barColorClass(pct) {
  if (pct >= 80) return 'bg-success'
  if (pct >= 50) return 'bg-primary'
  if (pct > 0) return 'bg-warning'
  return 'bg-secondary bg-opacity-25'
}

async function loadAnalytics() {
  try {
    const data = await analyticsService.getWeeklySummary()
    if (data?.days?.length) {
      summary.value = data
    }
  } catch (err) {
    console.warn('Analytics loading fallback:', err)
  }
}

onMounted(loadAnalytics)
</script>

<style scoped>
.transition-all {
  transition: height 0.4s ease, background-color 0.3s ease;
}
</style>

