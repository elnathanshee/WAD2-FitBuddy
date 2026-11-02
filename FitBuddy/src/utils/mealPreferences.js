import { authService } from '../services/authService'

const defaults = () => ({ dietary: [], allergies: '', favorites: [], weeklyPlan: {}, customRecipes: [] })
const storageKey = () => `fitbuddy_meal_preferences_${authService.getCurrentUser()?.id || 'guest'}`

export function loadMealPreferences() {
  try { return { ...defaults(), ...JSON.parse(localStorage.getItem(storageKey()) || '{}') } }
  catch { return defaults() }
}

export function saveMealPreferences(value) {
  localStorage.setItem(storageKey(), JSON.stringify({ ...defaults(), ...value }))
}
