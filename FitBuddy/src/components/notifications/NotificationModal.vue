<template>
  <AppModal title="🔔 Reminders & Notifications" @close="emit('close')">
    <div class="d-flex flex-column gap-3">
      <!-- 1. Device Push Status Banner -->
      <div
        class="p-3 rounded-3 d-flex align-items-center justify-content-between gap-3 border"
        :class="{
          'bg-success bg-opacity-10 border-success': permission === 'granted',
          'bg-warning bg-opacity-10 border-warning': permission === 'default',
          'bg-danger bg-opacity-10 border-danger': permission === 'denied',
        }"
      >
        <div class="d-flex align-items-center gap-2">
          <i
            class="bi fs-4"
            :class="{
              'bi-bell-fill text-success': permission === 'granted',
              'bi-bell text-warning': permission === 'default',
              'bi-bell-slash text-danger': permission === 'denied',
            }"
          ></i>
          <div>
            <div class="fw-semibold">
              <span v-if="permission === 'granted'">Device Push Enabled</span>
              <span v-else-if="permission === 'denied'">Notifications Blocked</span>
              <span v-else>Push Not Yet Enabled</span>
            </div>
            <div class="small text-muted">
              <span v-if="permission === 'granted'">This browser will receive habit reminders and friend cheers.</span>
              <span v-else-if="permission === 'denied'">Please allow notifications in your browser address bar settings.</span>
              <span v-else>Opt in to receive reminders and streak alerts.</span>
            </div>
          </div>
        </div>

        <button
          v-if="permission !== 'granted'"
          type="button"
          class="btn btn-sm btn-primary px-3 rounded-pill flex-shrink-0"
          :disabled="permission === 'denied' || requesting"
          @click="handleRequestPermission"
        >
          <span v-if="requesting" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-bell me-1"></i>Enable
        </button>
      </div>

      <!-- 2. OneSignal Service Status -->
      <div class="surface p-3 border rounded-3">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <span class="small text-uppercase fw-bold text-muted">OneSignal API Status</span>
          <span v-if="loadingStatus" class="spinner-border spinner-border-sm text-secondary"></span>
          <span
            v-else
            class="badge"
            :class="serverConfig.configured ? 'text-bg-success' : 'text-bg-secondary'"
          >
            {{ serverConfig.configured ? 'OneSignal Connected' : 'Simulated / Local Mode' }}
          </span>
        </div>

        <p class="small text-muted mb-0" v-if="serverConfig.configured">
          Connected to OneSignal App ID: <code>{{ serverConfig.appId }}</code>. Push notifications are delivered live to registered browsers.
        </p>
        <p class="small text-muted mb-0" v-else>
          OneSignal credentials not set in <code>server/.env</code>. Notifications will trigger in simulated mode with console logging.
        </p>
      </div>

      <!-- 3. Immediate Action Tests (Great for Demos & Grading) -->
      <div class="surface p-3 border rounded-3">
        <div class="fw-semibold mb-2">Test Notifications</div>
        <div class="d-flex flex-column gap-2">
          <button
            type="button"
            class="btn btn-outline-primary d-flex align-items-center justify-content-between text-start p-2 px-3"
            :disabled="testingPush"
            @click="handleSendTest"
          >
            <div>
              <div class="fw-semibold">
                <i class="bi bi-send me-1"></i>Send Instant Test Notification
              </div>
              <div class="small text-muted">Sends a direct test push to your HabitBuddy account</div>
            </div>
            <span v-if="testingPush" class="spinner-border spinner-border-sm"></span>
            <i v-else class="bi bi-chevron-right text-muted"></i>
          </button>

          <button
            type="button"
            class="btn btn-outline-success d-flex align-items-center justify-content-between text-start p-2 px-3"
            :disabled="testingReminder"
            @click="handleSendReminder"
          >
            <div>
              <div class="fw-semibold">
                <i class="bi bi-alarm me-1"></i>Trigger Daily Habit Reminder
              </div>
              <div class="small text-muted">Scans today's unfinished habits and sends an automated nudge</div>
            </div>
            <span v-if="testingReminder" class="spinner-border spinner-border-sm"></span>
            <i v-else class="bi bi-chevron-right text-muted"></i>
          </button>
        </div>
      </div>

      <!-- Action feedback alert -->
      <div v-if="statusFeedback" class="alert alert-info py-2 px-3 small mb-0 d-flex align-items-center gap-2" role="alert">
        <i class="bi bi-info-circle"></i>
        <span>{{ statusFeedback }}</span>
      </div>
    </div>

    <template #footer>
      <button type="button" class="btn btn-secondary px-4 rounded-pill" @click="emit('close')">
        Done
      </button>
    </template>
  </AppModal>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AppModal from '../habits/AppModal.vue'
import {
  getPermissionState,
  requestPushPermission,
  getNotificationStatus,
  sendTestNotification,
  sendHabitReminder,
} from '../../services/notificationService'

const emit = defineEmits(['close'])

const permission = ref('default')
const requesting = ref(false)
const testingPush = ref(false)
const testingReminder = ref(false)
const loadingStatus = ref(true)
const statusFeedback = ref('')
const serverConfig = ref({ configured: false, appId: null })

async function checkStatus() {
  permission.value = getPermissionState()
  try {
    serverConfig.value = await getNotificationStatus()
  } catch (err) {
    // fallback
  } finally {
    loadingStatus.value = false
  }
}

async function handleRequestPermission() {
  requesting.value = true
  statusFeedback.value = ''
  try {
    const res = await requestPushPermission()
    permission.value = res
    if (res === 'granted') {
      statusFeedback.value = 'Notifications enabled! You can now send a test notification.'
    } else if (res === 'denied') {
      statusFeedback.value = 'Permission was denied. You can re-enable it in your browser site permissions.'
    }
  } catch (err) {
    statusFeedback.value = `Permission request error: ${err.message}`
  } finally {
    requesting.value = false
  }
}

async function handleSendTest() {
  testingPush.value = true
  statusFeedback.value = ''
  try {
    const res = await sendTestNotification({
      title: '🎉 HabitBuddy Test Notification',
      message: 'OneSignal Web Push is working! Keep crushing your habits.',
    })
    statusFeedback.value = res.message || 'Test notification sent!'
  } catch (err) {
    statusFeedback.value = err?.response?.data?.message || err.message || 'Failed to send test push'
  } finally {
    testingPush.value = false
  }
}

async function handleSendReminder() {
  testingReminder.value = true
  statusFeedback.value = ''
  try {
    const res = await sendHabitReminder()
    if (res.pendingHabits?.length > 0) {
      statusFeedback.value = `Reminder dispatched for ${res.pendingHabits.length} unfinished habit(s): ${res.pendingHabits.join(', ')}`
    } else {
      statusFeedback.value = res.message || 'Reminder notification sent!'
    }
  } catch (err) {
    statusFeedback.value = err?.response?.data?.message || err.message || 'Failed to send habit reminder'
  } finally {
    testingReminder.value = false
  }
}

onMounted(() => {
  checkStatus()
})
</script>

