// Saves the Meal planner choices (diet, favourites, weekly plan, own recipes)
// in localStorage, one entry per user, so they survive a page reload.
import { useAuthStore } from '../stores/auth'

const defaults = () => ({ dietary: [], allergies: '', favorites: [], weeklyPlan: {}, customRecipes: [] })
const storageKey = () => `fitbuddy_meal_preferences_${useAuthStore().user?.id || 'guest'}`

export function loadMealPreferences() {
  try { return { ...defaults(), ...JSON.parse(localStorage.getItem(storageKey()) || '{}') } }
  catch { return defaults() }
}

export function saveMealPreferences(value) {
  localStorage.setItem(storageKey(), JSON.stringify({ ...defaults(), ...value }))
}
