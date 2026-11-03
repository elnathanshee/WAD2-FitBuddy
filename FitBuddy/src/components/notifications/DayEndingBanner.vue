<!--
  Alert banner shown when the user still has unfinished habits for today,
  displaying a live countdown until the day ends (midnight) and triggering
  a push/browser notification when time is running out.
-->
<template>
  <div
    v-if="visible"
    class="alert alert-warning d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4"
    role="status"
    data-testid="day-ending-banner"
  >
    <div class="d-flex align-items-start gap-2 min-w-0">
      <i class="bi bi-hourglass-split fs-5 flex-shrink-0" aria-hidden="true"></i>
      <div class="small">
        <div>
          <strong>
            {{ isUrgent ? 'Time is running out!' : 'Day ending countdown:' }}
          </strong>
          Only <strong>{{ timeRemaining.timeText }}</strong> left before the day ends —
          <strong>{{ unfinished.length }}</strong>
          {{ unfinished.length === 1 ? 'habit' : 'habits' }} still left today
          <span class="text-muted">({{ previewNames }})</span>.
        </div>
        <div v-if="notice" class="fw-semibold text-dark mt-1" data-testid="day-ending-feedback">
          <i class="bi bi-check2-circle me-1" aria-hidden="true"></i>{{ notice }}
        </div>
      </div>
    </div>

    <div class="d-flex align-items-center gap-2 ms-auto">
      <button
        type="button"
        class="btn btn-sm btn-warning fw-semibold"
        :disabled="sending"
        data-testid="day-ending-notify-btn"
        @click="sendAlertNow"
      >
        <i class="bi bi-bell-fill me-1" aria-hidden="true"></i>
        {{ sending ? 'Sending…' : 'Send alert' }}
      </button>
      <button
        type="button"
        class="btn-close"
        aria-label="Dismiss day-ending reminder"
        @click="dismissed = true"
      ></button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  notificationService,
  getTimeRemainingToday,
  getUnfinishedHabitsDueToday,
} from '../../services/notificationService'

const props = defineProps({
  habits: { type: Array, default: () => [] },
})

const dismissed = ref(false)
const sending = ref(false)
const notice = ref('')
const timeRemaining = ref(getTimeRemainingToday())

const unfinished = computed(() => getUnfinishedHabitsDueToday(props.habits))
const isUrgent = computed(
  () => timeRemaining.value.hoursLeft < notificationService.getDayEndingThresholdHours()
)
const visible = computed(() => !dismissed.value && unfinished.value.length > 0)

const previewNames = computed(() => {
  const names = unfinished.value.map((h) => h.name)
  if (names.length <= 3) return names.join(', ')
  return `${names.slice(0, 3).join(', ')} +${names.length - 3} more`
})

async function sendAlertNow() {
  sending.value = true
  notice.value = ''
  try {
    if (!notificationService.isBrowserSubscribed()) {
      await notificationService.requestPermission()
    }
    const names = unfinished.value.map((h) => h.name)
    const res = await notificationService.triggerDayEndingReminder(names)
    timeRemaining.value = getTimeRemainingToday()
    notice.value =
      res.notification?.title ||
      `Alert sent: ${timeRemaining.value.timeText} left to finish ${names.length} habit(s)!`
  } catch (err) {
    notice.value = err.response?.data?.message || err.message || 'Reminder triggered.'
  } finally {
    sending.value = false
  }
}

let timer = null
onMounted(() => {
  timer = setInterval(() => {
    timeRemaining.value = getTimeRemainingToday()
  }, 60000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

watch(
  () => props.habits,
  (list) => {
    if (Array.isArray(list) && list.length > 0) {
      notificationService.checkAndNotifyDayEnding(list).catch(() => {})
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.min-w-0 {
  min-width: 0;
}
</style>

