<template>
  <main class="container py-4 py-md-5" style="max-width: 860px">
    <header class="mb-4">
      <p class="eyebrow mb-2">Your personal plan</p>
      <h1 class="page-title">Choose your main goal</h1>
      <p class="page-subtitle">Your goal shapes the habits we suggest. Review it whenever you want, including monthly.</p>
    </header>

    <div v-if="error" class="alert alert-danger" role="alert">{{ error }}</div>
    <section class="surface p-4 p-md-5">
      <div class="mb-3">
        <label class="form-label fw-semibold" for="goal">What would you like to work toward?</label>
        <select id="goal" class="form-select" v-model="primaryGoal">
          <option v-for="item in GOAL_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
      </div>
      <div v-if="selectedGoal?.targetLabel" class="mb-4">
        <label class="form-label fw-semibold" for="target">{{ selectedGoal.targetLabel }}</label>
        <input id="target" v-model="goalTarget" maxlength="80" class="form-control" placeholder="Leave blank if you prefer">
        <div class="form-text">This is your own target. You can change it any time.</div>
      </div>
      <p v-else class="text-muted small mb-4">No number is needed for this goal. You can focus on building a routine that works for you.</p>

      <h2 class="h5 fw-bold">Suggested habits</h2>
      <p class="text-muted small">These are added automatically when you save. You can edit or remove them on the Habits page.</p>
      <ul class="list-group list-group-flush mb-4">
        <li v-for="habit in suggestions" :key="habit.name" class="list-group-item px-0 d-flex align-items-center gap-3">
          <span class="fs-4" aria-hidden="true">{{ habit.icon }}</span>
          <span class="flex-grow-1 fw-semibold">{{ habit.name }}</span>
          <span class="text-muted small">{{ habit.target.amount }} {{ habit.target.unit }} · daily</span>
        </li>
      </ul>
      <div class="d-flex flex-wrap align-items-center gap-3">
        <button type="button" class="btn btn-primary px-4" :disabled="saving" @click="saveGoal">
          <span v-if="saving" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
          {{ saved ? 'Saved' : 'Save goal and add habits' }}
        </button>
        <span v-if="success" class="text-success small" role="status">{{ success }}</span>
        <router-link to="/habits" class="btn btn-link">Edit your habits</router-link>
      </div>
      <p v-if="updatedAt" class="text-muted small mt-3 mb-0">Last updated {{ new Date(updatedAt).toLocaleDateString() }}</p>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import api from '../services/api'
import { habitService } from '../services/habitService'
import { GOAL_OPTIONS, GOAL_HABITS } from '../utils/goalOptions'

const primaryGoal = ref('wellness')
const goalTarget = ref('')
const updatedAt = ref('')
const saving = ref(false)
const saved = ref(false)
const success = ref('')
const error = ref('')
const existingNames = ref(new Set())
const selectedGoal = computed(() => GOAL_OPTIONS.find((goal) => goal.value === primaryGoal.value))
const suggestions = computed(() => GOAL_HABITS[primaryGoal.value] || GOAL_HABITS.wellness)

watch(primaryGoal, () => { saved.value = false; success.value = '' })

onMounted(async () => {
  try {
    const [{ data }, habits] = await Promise.all([api.get('/auth/goal'), habitService.list()])
    primaryGoal.value = data.goal.primaryGoal || 'wellness'
    goalTarget.value = data.goal.goalTarget || ''
    updatedAt.value = data.goal.updatedAt || ''
    existingNames.value = new Set((habits || []).map((habit) => habit.name.toLowerCase()))
  } catch (err) {
    error.value = err?.response?.data?.message || 'Could not load your goal. Please try again.'
  }
})

async function saveGoal() {
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    const { data } = await api.put('/auth/goal', { primaryGoal: primaryGoal.value, goalTarget: goalTarget.value })
    updatedAt.value = data.goal.updatedAt
    let added = 0
    for (const habit of suggestions.value) {
      if (existingNames.value.has(habit.name.toLowerCase())) continue
      await habitService.create(habit)
      existingNames.value.add(habit.name.toLowerCase())
      added += 1
    }
    saved.value = true
    success.value = added ? `${added} suggested habit${added === 1 ? '' : 's'} added to your plan.` : 'Your goal is saved. Your matching habits are already in your plan.'
  } catch (err) {
    error.value = err?.response?.data?.message || 'Could not save your plan. Please try again.'
  } finally {
    saving.value = false
  }
}
</script>
