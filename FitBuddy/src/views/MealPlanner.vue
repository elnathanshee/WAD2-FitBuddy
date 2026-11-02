<!--
  Meal planner: recipes picked for the user's main goal, a search box with tag
  filters, a 7-day plan with a shopping list, and a form to add own recipes.
  Preferences (diet, favourites, plan, custom recipes) are saved in localStorage
  per user - see utils/mealPreferences.js. No props or emits.
-->
<template>
  <main class="container py-4 py-md-5" style="max-width: 1120px">
    <header class="mb-4">
      <p class="eyebrow mb-2">Built around your goal</p>
      <h1 class="page-title">Meal planner</h1>
      <p class="page-subtitle">{{ goalLabel }} · {{ recipes.length }} recipes, including {{ preferences.customRecipes.length }} of yours.</p>
    </header>

    <section class="surface p-3 p-md-4 mb-4" aria-label="Add your own recipe">
      <details>
        <summary class="fw-semibold"><i class="bi bi-plus-circle me-2"></i>Add a recipe</summary>
        <form class="row g-3 pt-3" @submit.prevent="addRecipe">
          <div class="col-12 col-md-6"><label class="form-label" for="custom-meal-name">Recipe name</label><input id="custom-meal-name" v-model="recipeForm.name" class="form-control" maxlength="90" list="recipe-name-suggestions" required placeholder="Start typing, e.g. overnight oats" @change="suggestRecipeFromName" /><datalist id="recipe-name-suggestions"><option v-for="meal in allMealRecipes" :key="meal.key" :value="meal.name" /></datalist><div class="form-text">Choose a suggested recipe name to prefill its details. You can edit every field.</div></div>
          <div class="col-6 col-md-3"><label class="form-label" for="custom-meal-time">Prep time (minutes)</label><input id="custom-meal-time" v-model.number="recipeForm.minutes" class="form-control" type="number" min="1" max="600" required /></div>
          <fieldset class="col-12"><legend class="form-label mb-2">Tags</legend><div class="d-flex flex-wrap gap-3"><label v-for="tag in recipeTagOptions" :key="tag.value" class="form-check-label"><input v-model="recipeForm.tags" class="form-check-input me-1" type="checkbox" :value="tag.value" />{{ tag.label }}</label></div></fieldset>
          <div class="col-6 col-md-3" v-for="macro in macroFields" :key="macro.key"><label class="form-label" :for="`macro-${macro.key}`">{{ macro.label }}</label><input :id="`macro-${macro.key}`" v-model.number="recipeForm.macros[macro.key]" class="form-control" type="number" min="0" max="10000" required /></div>
          <div class="col-12 col-md-6"><label class="form-label" for="custom-ingredients">Ingredients (one per line)</label><textarea id="custom-ingredients" v-model="recipeForm.ingredientsText" class="form-control" rows="4" required placeholder="1 cup rice&#10;150 g tofu&#10;1 tbsp soy sauce"></textarea></div>
          <div class="col-12 col-md-6"><label class="form-label" for="custom-steps">Preparation steps (one per line)</label><textarea id="custom-steps" v-model="recipeForm.stepsText" class="form-control" rows="4" required placeholder="Cook the rice.&#10;Pan-fry the tofu.&#10;Serve together."></textarea></div>
          <div class="col-12"><label class="form-label" for="custom-source">Recipe link (optional)</label><input id="custom-source" v-model="recipeForm.sourceUrl" class="form-control" type="url" placeholder="https://…" /></div>
          <div class="col-12 d-flex align-items-center gap-3"><button class="btn btn-primary" type="submit">Save recipe</button><span v-if="recipeNotice" class="small text-success" role="status">{{ recipeNotice }}</span></div>
        </form>
      </details>
    </section>

    <section class="surface p-3 p-md-4 mb-4" aria-label="Meal preferences">
      <details class="mb-3"><summary class="fw-semibold">Dietary preferences and saved meals</summary><div class="pt-3"><div class="d-flex flex-wrap gap-3 mb-3"><label v-for="option in dietOptions" :key="option.value" class="form-check-label"><input v-model="preferences.dietary" class="form-check-input me-1" type="checkbox" :value="option.value" @change="savePreferences()" />{{ option.label }}</label></div><label class="form-label small" for="allergies">Allergies or ingredients to avoid</label><input id="allergies" v-model="preferences.allergies" class="form-control" placeholder="e.g. peanuts, shellfish" @change="savePreferences()" /><p class="form-text mb-0">Avoided ingredients are filtered from suggestions and your weekly plan. Always check labels and recipes yourself.</p><p class="small mb-0 mt-2">{{ preferences.favorites.length }} saved favorite{{ preferences.favorites.length === 1 ? '' : 's' }}</p></div></details>
      <label for="meal-search" class="form-label fw-semibold">What are you looking for?</label>
      <div class="input-group mb-3">
        <span class="input-group-text"><i class="bi bi-search" aria-hidden="true"></i></span>
        <input id="meal-search" v-model="search" class="form-control" type="search" placeholder="Try “quick vegetarian high protein” or “no-cook”" />
      </div>
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
        <span class="small fw-semibold">Tags · select any combination</span>
        <button v-if="activeFilters.length" type="button" class="btn btn-sm btn-link p-0" @click="activeFilters = []">Clear selected tags</button>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <button v-for="filter in MEAL_FILTERS" :key="filter.value" class="meal-filter-chip" :class="{ selected: activeFilters.includes(filter.value) }" type="button" :aria-pressed="activeFilters.includes(filter.value)" @click="toggleFilter(filter.value)">
          <i class="bi" :class="activeFilters.includes(filter.value) ? 'bi-check-square-fill' : 'bi-square'" aria-hidden="true"></i>{{ filter.label }}
        </button>
      </div>
      <p class="small text-muted mb-0 mt-2">When you select several tags, recipes match all of them.</p>
    </section>

    <section class="surface p-3 p-md-4 mb-4" aria-label="Weekly meal plan"><div class="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-3"><div><h2 class="h5 fw-bold mb-1">Your 7-day meal plan</h2><p class="text-muted small mb-0">Suggested for {{ goalLabel }} and your saved preferences. Change any day to fit your week.</p></div><button class="btn btn-sm btn-outline-secondary" @click="clearPlan">Clear plan</button></div><div class="row g-2"><div v-for="day in planDays" :key="day.key" class="col-12 col-md-6 col-lg-4"><label class="form-label small fw-semibold" :for="`meal-${day.key}`">{{ day.label }}</label><select :id="`meal-${day.key}`" v-model="preferences.weeklyPlan[day.key]" class="form-select form-select-sm" @change="savePreferences()"><option value="">Choose a meal</option><option v-for="meal in safeRecipes" :key="meal.key" :value="meal.key">{{ meal.name }}</option></select></div></div><div v-if="shoppingList.length" class="mt-4"><h3 class="h6 fw-bold">Shopping list <span class="text-muted fw-normal">({{ shoppingList.length }} ingredients)</span></h3><ul class="shopping-list list-unstyled mb-0"><li v-for="item in shoppingList" :key="item.name"><label class="d-flex gap-2 align-items-start"><input v-model="checkedShopping" type="checkbox" :value="item.name"/><span :class="{ 'text-decoration-line-through text-muted': checkedShopping.includes(item.name) }">{{ item.name }}<small class="d-block text-muted">{{ item.days.join(', ') }}</small></span></label></li></ul></div><p v-else class="small text-muted mt-3 mb-0">Pick meals above to build a combined shopping list.</p></section>
    <section v-if="recommended.length" class="mb-4"><h2 class="h5 fw-bold">Picked for you</h2><p class="small text-muted">Based on your goal, favorites, tags, and completed habits ({{ completedHabits }} today).</p><div class="d-flex flex-wrap gap-2"><button v-for="meal in recommended" :key="meal.key" class="btn btn-sm btn-tinted" @click="search = meal.name">{{ meal.name }} <i class="bi bi-arrow-right ms-1"></i></button></div></section>
    <p class="small text-muted mb-3">Macros are estimates per serving. These are original HabitBuddy recipes; externally sourced recipes will include a source link. Adjust ingredients for your dietary needs.</p>
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
          <button class="btn btn-sm align-self-start p-0 text-white" type="button" :aria-pressed="preferences.favorites.includes(meal.key)" @click="toggleFavorite(meal.key)"><i class="bi me-1" :class="preferences.favorites.includes(meal.key) ? 'bi-heart-fill' : 'bi-heart'"></i>{{ preferences.favorites.includes(meal.key) ? 'Saved favorite' : 'Save favorite' }}</button>
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
// Third-party library: Axios (https://axios-http.com) — used for HTTP calls to the Express API
import axios from 'axios'
import { authConfig } from '../services/api'
import { GOAL_OPTIONS } from '../utils/goalOptions'
import { allMealRecipes, MEAL_FILTERS, recipesForGoal } from '../utils/mealRecipes'
import { loadMealPreferences, saveMealPreferences as persistMealPreferences } from '../utils/mealPreferences'
import { habitService } from '../services/habitService'
import { toDateKey } from '../utils/dates'

const goal = ref('wellness')
const search = ref('')
const activeFilters = ref([])
const preferences = ref(loadMealPreferences())
const checkedShopping = ref([])
const completedHabits = ref(0)
const dietOptions = [{ value: 'vegetarian', label: 'Vegetarian' }, { value: 'dairy-free', label: 'Dairy-free' }, { value: 'gluten-free', label: 'Gluten-free' }]
const recipeNotice = ref('')
const macroFields = [{ key: 'calories', label: 'Calories (kcal)' }, { key: 'protein', label: 'Protein (g)' }, { key: 'carbs', label: 'Carbs (g)' }, { key: 'fat', label: 'Fat (g)' }]
const recipeTagOptions = MEAL_FILTERS.filter((filter) => filter.value !== 'lower-calorie')
const blankRecipeForm = () => ({ name: '', minutes: 20, tags: [], macros: { calories: 400, protein: 20, carbs: 45, fat: 12 }, ingredientsText: '', stepsText: '', sourceUrl: '' })
const recipeForm = ref(blankRecipeForm())
const goalLabel = computed(() => GOAL_OPTIONS.find((option) => option.value === goal.value)?.label || 'Feel healthier overall')
const recipes = computed(() => [...recipesForGoal(goal.value), ...preferences.value.customRecipes])
const safeRecipes = computed(() => recipes.value.filter((meal) => preferences.value.dietary.every((tag) => meal.tags.includes(tag)) && !preferences.value.allergies.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean).some((avoid) => `${meal.name} ${meal.ingredients.join(' ')}`.toLowerCase().includes(avoid))))
const planDays = computed(() => Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() + index); return { key: toDateKey(date), label: date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) } }))
const plannedMeals = computed(() => planDays.value.map((day) => ({ day, meal: safeRecipes.value.find((meal) => meal.key === preferences.value.weeklyPlan[day.key]) })).filter((entry) => entry.meal))
// Combine the ingredients of every planned meal into one list, remembering which days need each one
const shoppingList = computed(() => {
  const items = new Map()
  for (const { day, meal } of plannedMeals.value) {
    for (const name of meal.ingredients) {
      const item = items.get(name) || { name, days: [] }
      item.days.push(day.label.split(',')[0])
      items.set(name, item)
    }
  }
  return [...items.values()]
})
const recommended = computed(() => {
  const preferred = safeRecipes.value.filter((meal) => preferences.value.favorites.includes(meal.key) || meal.tags.some((tag) => activeFilters.value.includes(tag)))
  const quickFallback = completedHabits.value < 2 ? safeRecipes.value.filter((meal) => meal.tags.includes('quick')) : []
  return [...preferred, ...quickFallback, ...safeRecipes.value].filter((meal, index, all) => all.findIndex((item) => item.key === meal.key) === index).slice(0, 4)
})

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
  return safeRecipes.value.filter((meal) => {
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
function savePreferences() { persistMealPreferences(preferences.value) }
function toggleFavorite(key) { preferences.value.favorites = preferences.value.favorites.includes(key) ? preferences.value.favorites.filter((item) => item !== key) : [...preferences.value.favorites, key]; savePreferences() }
function clearPlan() { preferences.value.weeklyPlan = {}; checkedShopping.value = []; savePreferences() }
function suggestRecipeFromName() {
  const query = recipeForm.value.name.trim().toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ')
  if (!query) return
  const exact = allMealRecipes.find((meal) => meal.name.toLowerCase() === query)
  const containing = exact || allMealRecipes.find((meal) => meal.name.toLowerCase().includes(query) || query.includes(meal.name.toLowerCase()))
  const queryWords = query.split(' ').filter((word) => word.length > 2)
  const scored = allMealRecipes.map((meal) => {
    const words = `${meal.name} ${meal.ingredients.join(' ')}`.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
    return { meal, score: queryWords.filter((word) => words.includes(word)).length / Math.max(queryWords.length, 1) }
  }).sort((a, b) => b.score - a.score)[0]
  const match = containing || (scored?.score >= 0.5 ? scored.meal : null)
  if (!match) return
  recipeForm.value.name = recipeForm.value.name.trim() // Keep the title the user entered.
  recipeForm.value.minutes = match.minutes
  recipeForm.value.tags = [...match.tags.filter((tag) => recipeTagOptions.some((option) => option.value === tag))]
  recipeForm.value.macros = { ...match.macros }
  recipeForm.value.ingredientsText = match.ingredients.join('\n')
  recipeForm.value.stepsText = match.steps.join('\n')
  recipeForm.value.sourceUrl = match.sourceUrl || ''
  recipeNotice.value = `Filled in an estimate based on “${match.name}”. Review and edit it before saving.`
}
function addRecipe() {
  const sourceUrl = recipeForm.value.sourceUrl.trim()
  if (sourceUrl) { try { if (!['http:', 'https:'].includes(new URL(sourceUrl).protocol)) throw new Error('bad url') } catch { recipeNotice.value = 'Enter a valid http or https recipe link.'; return } }
  const entry = {
    key: `custom-${Date.now()}`, name: recipeForm.value.name.trim(), minutes: Number(recipeForm.value.minutes),
    macros: { calories: Number(recipeForm.value.macros.calories), protein: Number(recipeForm.value.macros.protein), carbs: Number(recipeForm.value.macros.carbs), fat: Number(recipeForm.value.macros.fat) },
    tags: [...recipeForm.value.tags], ingredients: recipeForm.value.ingredientsText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
    steps: recipeForm.value.stepsText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean), sourceUrl,
    sourceLabel: sourceUrl ? 'Your recipe link' : 'Your recipe',
  }
  if (!entry.ingredients.length || !entry.steps.length) { recipeNotice.value = 'Add at least one ingredient and one preparation step.'; return }
  preferences.value.customRecipes = [...preferences.value.customRecipes, entry]
  savePreferences()
  recipeForm.value = blankRecipeForm()
  recipeNotice.value = 'Recipe saved and added to your meal planner.'
  setTimeout(() => { recipeNotice.value = '' }, 3500)
}

// Give every day that has no meal yet a suggested one, cycling through the safe recipes
function fillEmptyPlanDays() {
  if (safeRecipes.value.length === 0) return
  planDays.value.forEach((day, index) => {
    if (!preferences.value.weeklyPlan[day.key]) {
      preferences.value.weeklyPlan[day.key] = safeRecipes.value[index % safeRecipes.value.length].key
    }
  })
}

onMounted(async () => {
  try {
    const { data } = await axios.get('/api/auth/goal', authConfig())
    goal.value = data.goal.primaryGoal || 'wellness'
  } catch { /* show the general wellness plan if no saved goal is available */ }
  try { const habits = await habitService.list(toDateKey()); completedHabits.value = habits.filter((habit) => habit.periodCount >= habit.target.amount).length } catch { /* goal and saved favorites still personalize the picks */ }
  fillEmptyPlanDays()
  savePreferences()
})
</script>

<style scoped>
.meal-card { border: 1px solid #164b34; background: #246c49; color: #f7fff8; box-shadow: 0 8px 24px rgba(20, 70, 45, .18); }
.macro-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .45rem; }
.macro-grid span { display: flex; flex-direction: column; border-radius: var(--r-sm); background: rgba(255, 255, 255, .13); padding: .5rem; }
.macro-grid strong { font-size: .95rem; }
.macro-grid small { color: rgba(255, 255, 255, .82); font-size: .7rem; }
.meal-tag { color: #17432f; background: #d7efdf; font-weight: 700; }
.meal-card .text-muted { color: #d4e8d8 !important; }
.meal-filter-chip { display: inline-flex; align-items: center; gap: .4rem; border: 1px solid var(--fb-hairline); border-radius: 999px; padding: .4rem .7rem; background: var(--fb-surface); color: var(--fb-text); font-size: .82rem; font-weight: 600; }
.meal-filter-chip.selected { background: var(--fb-green-solid); border-color: var(--fb-green-solid); color: #fff; }
.meal-card li + li { margin-top: .2rem; }
.shopping-list { columns: 2; }
.shopping-list li { break-inside: avoid; margin-bottom: .5rem; }
@media (max-width: 575.98px) { .shopping-list { columns: 1; } }
</style>
