<!--
  =============================================================================
  [IS216 Project Addition: Gemini AI Goal Coach Modal]
  Technology: Vue 3 (<script setup>), Bootstrap 5, Bootstrap Icons, Axios
  
  Description:
  Interactive modal that allows the user to describe their lifestyle/goals or
  complete a guided questionnaire. Calls the Express backend (/api/ai/suggest-habits)
  which uses Google's Gemini API to generate structured habits matching the database format.
  Users can then add suggested habits directly to their habit list.
  =============================================================================
-->
<template>
  <AppModal title="✨ Gemini AI Goal Coach" size="lg" @close="emit('close')">
    <!-- Subtitle / Intro -->
    <p class="text-muted small mb-3">
      Describe your current routine and health goals, or answer our quick questionnaire.
      HabitBuddy's AI coach will generate realistic, personalized habits tailored to your schedule.
    </p>

    <!-- Error Banner -->
    <div v-if="errorMessage" class="alert alert-danger alert-dismissible fade show" role="alert">
      <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ errorMessage }}
      <button type="button" class="btn-close" aria-label="Close" @click="errorMessage = ''"></button>
    </div>

    <!-- API Key Collapsible / Inline input -->
    <div class="card bg-light border-0 mb-3 p-3 rounded-3">
      <div class="d-flex align-items-center justify-content-between">
        <label for="apiKeyInput" class="form-label mb-0 small fw-semibold text-secondary">
          <i class="bi bi-key-fill text-warning me-1"></i>Gemini API Key:
        </label>
        <span class="badge bg-secondary-subtle text-secondary" style="font-size: 0.75rem;">
          {{ storedApiKey ? 'Key Saved' : 'Optional if in server/.env' }}
        </span>
      </div>
      <div class="input-group input-group-sm mt-2">
        <input
          id="apiKeyInput"
          v-model="apiKey"
          :type="showApiKey ? 'text' : 'password'"
          class="form-control"
          placeholder="Paste AI Studio Gemini Key (e.g. AIzaSy...)"
          @change="saveApiKey"
        />
        <button
          type="button"
          class="btn btn-outline-secondary"
          @click="showApiKey = !showApiKey"
          :title="showApiKey ? 'Hide Key' : 'Show Key'"
        >
          <i class="bi" :class="showApiKey ? 'bi-eye-slash' : 'bi-eye'"></i>
        </button>
      </div>
    </div>

    <!-- Tabs: Freeform Prompt vs Guided Questionnaire -->
    <ul class="nav nav-pills nav-fill mb-3" role="tablist">
      <li class="nav-item" role="presentation">
        <button
          type="button"
          class="nav-link"
          :class="{ active: activeTab === 'freeform' }"
          @click="activeTab = 'freeform'"
        >
          <i class="bi bi-chat-heart me-1"></i>Describe My Goal
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button
          type="button"
          class="nav-link"
          :class="{ active: activeTab === 'questionnaire' }"
          @click="activeTab = 'questionnaire'"
        >
          <i class="bi bi-ui-checks-grid me-1"></i>Quick Questionnaire
        </button>
      </li>
    </ul>

    <!-- Tab 1: Freeform Input -->
    <div v-if="activeTab === 'freeform'">
      <div class="mb-3">
        <label for="promptInput" class="form-label fw-semibold small">
          Tell the coach about your lifestyle and what you want to achieve:
        </label>
        <textarea
          id="promptInput"
          v-model="userPrompt"
          rows="3"
          class="form-control"
          placeholder="e.g. I'm a student sitting at a desk studying 8 hours a day, constantly fatigued and drinking energy drinks. I want to build better daily stamina, drink more water, and sleep before 1 AM."
        ></textarea>
      </div>

      <!-- Quick Inspiration Chips -->
      <div class="mb-3">
        <div class="small text-muted mb-2 fw-semibold">Quick inspiration presets:</div>
        <div class="d-flex flex-wrap gap-2">
          <button
            v-for="(chip, index) in inspirationChips"
            :key="index"
            type="button"
            class="btn btn-sm btn-outline-primary rounded-pill"
            @click="userPrompt = chip"
          >
            {{ chip }}
          </button>
        </div>
      </div>
    </div>

    <!-- Tab 2: Guided Questionnaire -->
    <div v-else class="row g-3">
      <div class="col-12 col-md-6">
        <label class="form-label fw-semibold small">Primary Health Focus</label>
        <select v-model="quiz.goal" class="form-select form-select-sm">
          <option value="Boost daily energy and mental focus">⚡ Boost daily energy & mental focus</option>
          <option value="Build exercise stamina and strength">🏋️ Build exercise stamina & strength</option>
          <option value="Improve sleep schedule and wake up early">😴 Better sleep schedule & wake up refreshed</option>
          <option value="Drink more water and eat healthier snacks">🥗 Better hydration & mindful nutrition</option>
          <option value="Reduce stress and study fatigue">🧘 Stress relief & study stamina</option>
        </select>
      </div>

      <div class="col-12 col-md-6">
        <label class="form-label fw-semibold small">Current Activity Level</label>
        <select v-model="quiz.activityLevel" class="form-select form-select-sm">
          <option value="Sedentary (mostly sitting, studying or desk work)">Sedentary (mostly desk/study work)</option>
          <option value="Lightly active (occasional walks between campus)">Lightly active (walking to classes)</option>
          <option value="Moderately active (workout 1-2 times a week)">Moderately active (workouts 1-2x/week)</option>
        </select>
      </div>

      <div class="col-12 col-md-6">
        <label class="form-label fw-semibold small">Time You Can Commit Each Day</label>
        <select v-model="quiz.dailyTime" class="form-select form-select-sm">
          <option value="5 to 10 minutes (micro-habits)">5 to 10 minutes (easy micro-habits)</option>
          <option value="15 to 30 minutes">15 to 30 minutes</option>
          <option value="45 minutes or more">45+ minutes</option>
        </select>
      </div>

      <div class="col-12 col-md-6">
        <label class="form-label fw-semibold small">Biggest Obstacle</label>
        <select v-model="quiz.obstacle" class="form-select form-select-sm">
          <option value="Lack of consistency / forgetting">Forgetting or losing momentum</option>
          <option value="Too busy with assignments and exams">Busy exam / assignment deadlines</option>
          <option value="Feeling tired and lacking motivation">Feeling low energy / demotivated</option>
        </select>
      </div>
    </div>

    <!-- Action Button to Trigger AI -->
    <div class="mt-3 text-end">
      <button
        type="button"
        class="btn btn-primary rounded-pill px-4 fw-semibold"
        :disabled="generating || (!userPrompt.trim() && activeTab === 'freeform')"
        @click="generateHabits"
      >
        <span v-if="generating" class="spinner-border spinner-border-sm me-2" role="status"></span>
        <i v-else class="bi bi-stars me-2"></i>
        {{ generating ? 'Generating Habits...' : 'Ask AI Coach' }}
      </button>
    </div>

    <!-- Results Section -->
    <div v-if="suggestions.length > 0" class="mt-4 pt-3 border-top">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h6 class="fw-bold mb-0">
          <i class="bi bi-lightning-charge-fill text-warning me-1"></i>
          Recommended Habits ({{ suggestions.length }})
        </h6>
        <button
          v-if="unaddedCount > 1"
          type="button"
          class="btn btn-sm btn-outline-success rounded-pill px-3"
          :disabled="addingAll"
          @click="addAllHabits"
        >
          <span v-if="addingAll" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-check2-all me-1"></i>Add All
        </button>
      </div>

      <div class="row g-2">
        <div v-for="(item, idx) in suggestions" :key="idx" class="col-12">
          <div class="card border rounded-3 p-3 shadow-sm bg-white">
            <div class="d-flex align-items-start justify-content-between gap-2">
              <div class="d-flex align-items-center gap-3">
                <span class="fs-2 lh-1">{{ item.icon || '🎯' }}</span>
                <div>
                  <div class="d-flex align-items-center gap-2 flex-wrap">
                    <strong class="fs-6">{{ item.name }}</strong>
                    <span class="badge" :class="categoryBadgeClass(item.category)">
                      {{ item.category }}
                    </span>
                    <span class="badge bg-light text-dark border">
                      {{ item.target?.amount }} {{ item.target?.unit }} / {{ item.frequency }}
                    </span>
                  </div>
                  <p class="text-muted small mb-0 mt-1">
                    {{ item.description }}
                  </p>
                </div>
              </div>

              <!-- Add to Habit List Button -->
              <div class="flex-shrink-0">
                <button
                  v-if="!addedIndices.includes(idx)"
                  type="button"
                  class="btn btn-sm btn-outline-primary rounded-pill px-3"
                  :disabled="addingIndex === idx"
                  @click="addSingleHabit(item, idx)"
                >
                  <span v-if="addingIndex === idx" class="spinner-border spinner-border-sm me-1"></span>
                  <i v-else class="bi bi-plus me-1"></i>Add
                </button>
                <span v-else class="badge bg-success-subtle text-success border border-success-subtle py-2 px-3 rounded-pill">
                  <i class="bi bi-check-circle-fill me-1"></i>Added
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Footer -->
    <template #footer>
      <button type="button" class="btn btn-secondary rounded-pill px-4" @click="emit('close')">
        Close
      </button>
    </template>
  </AppModal>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import AppModal from './AppModal.vue'
import { aiService } from '../../services/aiService'
import { habitService, errorMessage as formatError } from '../../services/habitService'

const emit = defineEmits(['close', 'saved'])

// State
const activeTab = ref('freeform')
const userPrompt = ref('')
const apiKey = ref('')
const showApiKey = ref(false)
const storedApiKey = ref(false)

const generating = ref(false)
const errorMessage = ref('')
const suggestions = ref([])
const addedIndices = ref([])
const addingIndex = ref(null)
const addingAll = ref(false)

// Questionnaire state
const quiz = ref({
  goal: 'Boost daily energy and mental focus',
  activityLevel: 'Sedentary (mostly sitting, studying or desk work)',
  dailyTime: '15 to 30 minutes',
  obstacle: 'Lack of consistency / forgetting',
})

// Sample prompt chips
const inspirationChips = [
  'Help me get 8 hours of sleep and stop late night screen time',
  'Desk student wanting to drink 8 glasses of water & walk 30 mins',
  'Beginner workout routine for university students with exam stress',
  'Morning routine to feel more energized before 8:30 AM classes',
]

onMounted(() => {
  const saved = localStorage.getItem('fitbuddy_gemini_api_key')
  if (saved) {
    apiKey.value = saved
    storedApiKey.value = true
  }
})

function saveApiKey() {
  if (apiKey.value.trim()) {
    localStorage.setItem('fitbuddy_gemini_api_key', apiKey.value.trim())
    storedApiKey.value = true
  } else {
    localStorage.removeItem('fitbuddy_gemini_api_key')
    storedApiKey.value = false
  }
}

const unaddedCount = computed(() => {
  return suggestions.value.filter((_, idx) => !addedIndices.value.includes(idx)).length
})

function categoryBadgeClass(cat) {
  switch (cat) {
    case 'exercise':
      return 'bg-success'
    case 'water':
      return 'bg-info text-dark'
    case 'sleep':
      return 'bg-primary'
    case 'study':
      return 'bg-warning text-dark'
    default:
      return 'bg-secondary'
  }
}

async function generateHabits() {
  errorMessage.value = ''
  generating.value = true
  suggestions.value = []
  addedIndices.value = []

  try {
    const payload = {
      apiKey: apiKey.value.trim() || undefined,
    }

    if (activeTab.value === 'freeform') {
      payload.prompt = userPrompt.value.trim()
    } else {
      payload.questionnaire = quiz.value
    }

    const result = await aiService.suggestHabits(payload)
    if (!result || result.length === 0) {
      errorMessage.value = 'The AI did not return any recommendations. Please try refining your description.'
    } else {
      suggestions.value = result
    }
  } catch (err) {
    errorMessage.value = formatError(err)
  } finally {
    generating.value = false
  }
}

async function addSingleHabit(habit, idx) {
  addingIndex.value = idx
  errorMessage.value = ''
  try {
    await habitService.create({
      name: habit.name,
      category: habit.category,
      frequency: habit.frequency,
      target: habit.target,
      icon: habit.icon,
    })
    addedIndices.value.push(idx)
    emit('saved')
  } catch (err) {
    errorMessage.value = formatError(err)
  } finally {
    addingIndex.value = null
  }
}

async function addAllHabits() {
  addingAll.value = true
  errorMessage.value = ''
  try {
    for (let i = 0; i < suggestions.value.length; i++) {
      if (!addedIndices.value.includes(i)) {
        const habit = suggestions.value[i]
        await habitService.create({
          name: habit.name,
          category: habit.category,
          frequency: habit.frequency,
          target: habit.target,
          icon: habit.icon,
        })
        addedIndices.value.push(i)
      }
    }
    emit('saved')
  } catch (err) {
    errorMessage.value = formatError(err)
  } finally {
    addingAll.value = false
  }
}
</script>

