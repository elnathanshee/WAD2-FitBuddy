<template>
  <AppModal title="Push Notifications" @close="emit('close')">
    <!-- Status Card -->
    <div class="d-flex align-items-center justify-content-between p-3 rounded-3 bg-light border mb-3">
      <div>
        <div class="fw-bold text-dark">Browser Push Subscription</div>
        <div class="text-muted small">
          {{ isSubscribed ? 'Subscribed to habit reminders & day-ending alerts' : 'Enable browser alerts to stay on track' }}
        </div>
      </div>
      <span
        class="badge rounded-pill px-3 py-2"
        :class="isSubscribed ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'"
      >
        {{ isSubscribed ? 'Enabled' : 'Disabled' }}
      </span>
    </div>

    <!-- Day-Ending / Time Running Out Alert Settings -->
    <div class="p-3 rounded-3 border mb-3" data-testid="day-ending-settings">
      <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
        <div>
          <div class="fw-bold text-dark">
            <i class="bi bi-hourglass-split text-warning me-1" aria-hidden="true"></i>Time Running Out / Day-Ending Alert
          </div>
          <div class="text-muted small">
            Warns you before midnight ({{ timeRemaining.timeText }} left today) when you still have unfinished habits.
          </div>
        </div>
      </div>
      <div class="d-flex align-items-center gap-2 mt-2">
        <label for="day-ending-threshold" class="form-label small fw-semibold mb-0 text-nowrap">
          Alert when less than:
        </label>
        <select
          id="day-ending-threshold"
          v-model.number="thresholdHours"
          class="form-select form-select-sm"
          data-testid="day-ending-threshold-select"
          @change="saveThreshold"
        >
          <option :value="3">3 hours left in the day</option>
          <option :value="6">6 hours left in the day (after 6 PM)</option>
          <option :value="12">12 hours left in the day (after 12 PM)</option>
          <option :value="24">Always warn when habits are unfinished today</option>
        </select>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="d-grid gap-2 mb-3">
      <button
        v-if="!isSubscribed"
        class="btn btn-primary fw-semibold"
        :disabled="busy"
        @click="enableNotifications"
      >
        <i class="bi bi-bell-fill me-1"></i> Enable Push Notifications
      </button>

      <button
        class="btn btn-warning fw-semibold"
        data-testid="trigger-day-ending-btn"
        :disabled="busy"
        @click="sendDayEndingWarning"
      >
        <i class="bi bi-hourglass-bottom me-1"></i> Trigger "Time is Running Out" Alert
      </button>

      <button
        class="btn btn-outline-primary fw-semibold"
        :disabled="busy"
        @click="sendHabitReminder"
      >
        <i class="bi bi-alarm me-1"></i> Trigger Daily Habit Reminder
      </button>

      <button
        class="btn btn-outline-secondary fw-semibold"
        :disabled="busy"
        @click="sendTestPush"
      >
        <i class="bi bi-send me-1"></i> Send Test Push Notification
      </button>
    </div>

    <!-- Feedback Toast -->
    <div
      v-if="feedback"
      class="alert py-2 px-3 small mb-0"
      :class="feedbackType === 'error' ? 'alert-danger' : 'alert-success'"
    >
      <div class="fw-bold">{{ feedbackTitle }}</div>
      <div>{{ feedback }}</div>
    </div>

    <template #footer>
      <button type="button" class="btn btn-outline-secondary px-4" @click="emit('close')">Done</button>
    </template>
  </AppModal>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AppModal from '../habits/AppModal.vue'
import { notificationService, getTimeRemainingToday } from '../../services/notificationService'

const emit = defineEmits(['close'])

const isSubscribed = ref(false)
const busy = ref(false)
const feedbackTitle = ref('')
const feedback = ref('')
const feedbackType = ref('success')
const thresholdHours = ref(notificationService.getDayEndingThresholdHours())
const timeRemaining = ref(getTimeRemainingToday())

function saveThreshold() {
  notificationService.setDayEndingThresholdHours(thresholdHours.value)
  feedbackType.value = 'success'
  feedbackTitle.value = 'Day-Ending Alert Updated'
  feedback.value =
    thresholdHours.value >= 24
      ? 'You will always see a day-ending reminder when habits are unfinished today.'
      : `You will be notified when less than ${thresholdHours.value} hours remain in the day.`
}

async function enableNotifications() {
  busy.value = true
  feedback.value = ''
  try {
    const perm = await notificationService.requestPermission()
    isSubscribed.value = perm === 'granted'
    if (isSubscribed.value) {
      feedbackType.value = 'success'
      feedbackTitle.value = 'Notifications Enabled!'
      feedback.value = 'You will now receive FitBuddy habit reminders, day-ending warnings, and friend cheers.'
    } else {
      feedbackType.value = 'error'
      feedbackTitle.value = 'Permission Denied'
      feedback.value = 'Please allow notifications in your browser settings.'
    }
  } finally {
    busy.value = false
  }
}

async function sendDayEndingWarning() {
  busy.value = true
  feedback.value = ''
  try {
    if (!isSubscribed.value) {
      await notificationService.requestPermission()
      isSubscribed.value = notificationService.isBrowserSubscribed()
    }
    const res = await notificationService.triggerDayEndingReminder()
    timeRemaining.value = getTimeRemainingToday()
    feedbackType.value = 'success'
    feedbackTitle.value = res.notification?.title || '⏳ Time is Running Out!'
    feedback.value =
      res.notification?.message ||
      `Only ${timeRemaining.value.timeText} left before the day ends (${res.remainingCount ?? 0} unfinished habits).`
  } catch (err) {
    feedbackType.value = 'error'
    feedbackTitle.value = 'Day-Ending Alert Failed'
    feedback.value = err.response?.data?.message || err.message
  } finally {
    busy.value = false
  }
}

async function sendTestPush() {
  busy.value = true
  feedback.value = ''
  try {
    const res = await notificationService.sendTest()
    feedbackType.value = 'success'
    feedbackTitle.value = res.notification?.title || 'Test Sent!'
    feedback.value = res.notification?.message || 'Push notification dispatched.'
  } catch (err) {
    feedbackType.value = 'error'
    feedbackTitle.value = 'Notification Failed'
    feedback.value = err.response?.data?.message || err.message
  } finally {
    busy.value = false
  }
}

async function sendHabitReminder() {
  busy.value = true
  feedback.value = ''
  try {
    const res = await notificationService.triggerHabitReminder()
    feedbackType.value = 'success'
    feedbackTitle.value = res.notification?.title || 'Reminder Dispatched!'
    feedback.value = res.notification?.message || `${res.remainingCount} incomplete habits found.`
  } catch (err) {
    feedbackType.value = 'error'
    feedbackTitle.value = 'Reminder Failed'
    feedback.value = err.response?.data?.message || err.message
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  isSubscribed.value = notificationService.isBrowserSubscribed()
  timeRemaining.value = getTimeRemainingToday()
  try {
    await notificationService.getStatus()
  } catch {
    // Offline fallback
  }
})
</script>
