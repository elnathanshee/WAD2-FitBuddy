<template>
  <main class="container py-4 py-md-5" style="max-width: 1120px">
    <header class="mb-4">
      <p class="eyebrow mb-2">Built around your goal</p>
      <h1 class="page-title">Meal planner</h1>
      <p class="page-subtitle">{{ goalLabel }} · Five starter recipes, with filters for the way you like to eat.</p>
    </header>

    <section class="surface p-3 p-md-4 mb-4" aria-label="Meal preferences">
      <label for="meal-search" class="form-label fw-semibold">What are you looking for?</label>
      <div class="input-group mb-3">
        <span class="input-group-text"><i class="bi bi-search" aria-hidden="true"></i></span>
        <input id="meal-search" v-model="search" class="form-control" type="search" placeholder="Try “quick vegetarian high protein” or “cheap meals”" />
      </div>
      <div class="d-flex flex-wrap gap-2">
        <button v-for="filter in MEAL_FILTERS" :key="filter.value" class="btn btn-sm" :class="activeFilters.includes(filter.value) ? 'btn-primary' : 'btn-outline-secondary'" type="button" :aria-pressed="activeFilters.includes(filter.value)" @click="toggleFilter(filter.value)">{{ filter.label }}</button>
      </div>
    </section>

    <p class="small text-muted mb-3">Macros are estimates per serving. Recipes are original HabitBuddy suggestions; select an external source link when one is listed. Adjust ingredients for your dietary needs.</p>
    <div v-if="!visibleRecipes.length" class="surface text-center p-5">
      <h2 class="h5 fw-bold">No recipes match those filters</h2>
      <p class="text-muted mb-0">Try another phrase or clear a filter.</p>
    </div>
    <div v-else class="row g-3">
      <div v-for="meal in visibleRecipes" :key="meal.key" class="col-12 col-md-6 col-xl-4">
        <article class="surface meal-card p-4 h-100 d-flex flex-column">
          <div class="d-flex align-items-start justify-content-between gap-2">
            <h2 class="h5 fw-bold mb-1">{{ meal.name }}</h2>
            <span class="badge rounded-pill text-bg-light text-nowrap"><i class="bi bi-clock me-1" aria-hidden="true"></i>{{ meal.minutes }} min</span>
          </div>
          <div class="macro-grid my-3" :aria-label="`Estimated nutrition: ${meal.macros.calories} calories, ${meal.macros.protein} grams protein, ${meal.macros.carbs} grams carbs, ${meal.macros.fat} grams fat`">
            <span><strong>{{ meal.macros.calories }}</strong><small>kcal</small></span>
            <span><strong>{{ meal.macros.protein }}g</strong><small>protein</small></span>
            <span><strong>{{ meal.macros.carbs }}g</strong><small>carbs</small></span>
            <span><strong>{{ meal.macros.fat }}g</strong><small>fat</small></span>
          </div>
          <div class="d-flex flex-wrap gap-1 mb-3">
            <span v-for="tag in meal.tags" :key="tag" class="badge rounded-pill meal-tag">{{ tagLabel(tag) }}</span>
          </div>
          <h3 class="h6 fw-bold">Ingredients</h3>
          <ul class="small ps-3 mb-3"><li v-for="ingredient in meal.ingredients" :key="ingredient">{{ ingredient }}</li></ul>
          <h3 class="h6 fw-bold">Quick method</h3>
          <ol class="small ps-3 mb-3"><li v-for="step in meal.steps" :key="step">{{ step }}</li></ol>
          <div class="mt-auto pt-2 small">
            <a v-if="meal.sourceUrl" :href="meal.sourceUrl" target="_blank" rel="noopener noreferrer">Open recipe at {{ meal.sourceLabel }} <i class="bi bi-box-arrow-up-right ms-1" aria-hidden="true"></i></a>
            <span v-else class="text-muted">{{ meal.sourceLabel }}</span>
          </div>
        </article>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../services/api'
import { GOAL_OPTIONS } from '../utils/goalOptions'
import { MEAL_FILTERS, recipesForGoal } from '../utils/mealRecipes'

const goal = ref('wellness')
const search = ref('')
const activeFilters = ref([])
const goalLabel = computed(() => GOAL_OPTIONS.find((option) => option.value === goal.value)?.label || 'Feel healthier overall')
const recipes = computed(() => recipesForGoal(goal.value))

const detectedSearchFilters = computed(() => {
  const text = search.value.toLowerCase()
  const detected = MEAL_FILTERS.filter((filter) => [filter.label.toLowerCase(), ...filter.aliases].some((alias) => text.includes(alias))).map((filter) => filter.value)
  if (/\bvegan\b/.test(text)) detected.push('vegetarian', 'dairy-free')
  return detected
})
const visibleRecipes = computed(() => {
  const query = search.value.toLowerCase().trim()
  const filters = [...new Set([...activeFilters.value, ...detectedSearchFilters.value])]
  let textOnly = query
  for (const filter of MEAL_FILTERS) {
    for (const phrase of [filter.label.toLowerCase(), ...filter.aliases]) textOnly = textOnly.replaceAll(phrase, ' ')
  }
  textOnly = textOnly.replaceAll('vegan', ' ').replace(/\b(i|need|want|a|an|the|meal|meals|recipe|recipes|food|to|eat|for|some|something|please|breakfast|lunch|dinner|snack)\b/g, ' ')
  return recipes.value.filter((meal) => {
    const matchesFilters = filters.every((filter) => filter === 'lower-calorie' ? meal.macros.calories <= 450 : meal.tags.includes(filter))
    const tokens = textOnly.split(/\s+/).filter(Boolean)
    const content = `${meal.name} ${meal.tags.join(' ')} ${meal.ingredients.join(' ')}`.toLowerCase()
    return matchesFilters && tokens.every((token) => content.includes(token))
  })
})

function toggleFilter(value) {
  activeFilters.value = activeFilters.value.includes(value) ? activeFilters.value.filter((item) => item !== value) : [...activeFilters.value, value]
}

function tagLabel(value) {
  return MEAL_FILTERS.find((filter) => filter.value === value)?.label || value
}

onMounted(async () => {
  try {
    const { data } = await api.get('/auth/goal')
    goal.value = data.goal.primaryGoal || 'wellness'
  } catch { /* show the general wellness plan if no saved goal is available */ }
})
</script>

<style scoped>
.meal-card { border: 1px solid var(--fb-hairline); }
.macro-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .45rem; }
.macro-grid span { display: flex; flex-direction: column; border-radius: var(--r-sm); background: var(--fb-bg); padding: .5rem; }
.macro-grid strong { font-size: .95rem; }
.macro-grid small { color: var(--fb-text-2); font-size: .7rem; }
.meal-tag { color: var(--fb-text-2); background: var(--fb-surface-2); font-weight: 600; }
.meal-card li + li { margin-top: .2rem; }
</style>
