// Choices shown in the habit form, plus number formatting for amounts.

// Suggested categories. Choosing "other" lets the user type their own.
export const CATEGORIES = [
  { value: 'exercise', label: 'Exercise' },
  { value: 'water', label: 'Water' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'study', label: 'Study' },
  { value: 'other', label: 'Other…' },
]
export const PRESET_CATEGORY_VALUES = CATEGORIES.map((c) => c.value).filter((v) => v !== 'other')

// Lightweight name-based defaults for new habits. These only prefill the form;
// every suggested field stays editable by the user.
const HABIT_SUGGESTIONS = [
  { match: /\b(water\s+plants?|gardening)\b/, icon: '🪴', category: 'other', customCategory: 'Gardening', frequency: 'daily', amount: 1, unit: 'sessions' },
  { match: /\b(water|hydration|hydrate|hydrating)\b/, icon: '💧', category: 'water', frequency: 'daily', amount: 8, unit: 'glasses' },
  { match: /\b(sleep|sleeping|bedtime)\b/, icon: '😴', category: 'sleep', frequency: 'daily', amount: 8, unit: 'hours' },
  { match: /\b(walk|walking|steps)\b/, icon: '🚶', category: 'exercise', frequency: 'daily', amount: 10000, unit: 'steps' },
  { match: /\b(gym|gymming)\b/, icon: '🏋️', category: 'exercise', frequency: 'weekly', amount: 3, unit: 'sessions' },
  { match: /\b(run|running|jog|jogging)\b/, icon: '🏃', category: 'exercise', frequency: 'daily', amount: 30, unit: 'minutes' },
  { match: /\b(yoga|stretch|stretching)\b/, icon: '🧘', category: 'exercise', frequency: 'daily', amount: 15, unit: 'minutes' },
  { match: /\b(workout|exercise|training)\b/, icon: '💪', category: 'exercise', frequency: 'daily', amount: 30, unit: 'minutes' },
  { match: /\b(study|studying|read|reading|book)\b/, icon: '📚', category: 'study', frequency: 'daily', amount: 30, unit: 'minutes' },
  { match: /\b(meditat|mindful|breathing|breathwork)\w*\b/, icon: '🧘', category: 'other', customCategory: 'Mindfulness', frequency: 'daily', amount: 10, unit: 'minutes' },
  { match: /\b(journal|journaling|gratitude)\b/, icon: '📓', category: 'other', customCategory: 'Journaling', frequency: 'daily', amount: 1, unit: 'sessions' },
  { match: /\b(vegetable|vegetables|fruit|fruits|healthy eating)\b/, icon: '🥗', category: 'other', customCategory: 'Nutrition', frequency: 'daily', amount: 5, unit: 'servings' },
]

export function suggestHabitSettings(name) {
  const normalizedName = String(name ?? '').trim().toLowerCase()
  const suggestion = HABIT_SUGGESTIONS.find(({ match }) => match.test(normalizedName))
  if (!suggestion) return null
  const { match, ...settings } = suggestion
  return settings
}

// Common units of measurement, grouped for the <optgroup>s in the dropdown.
export const UNIT_GROUPS = [
  { label: 'Count', units: ['times', 'reps', 'sets', 'steps', 'pages', 'glasses', 'cups', 'servings', 'sessions'] },
  { label: 'Time', units: ['seconds', 'minutes', 'hours'] },
  { label: 'Distance', units: ['metres', 'km', 'miles'] },
  { label: 'Volume', units: ['ml', 'litres', 'fl oz'] },
  { label: 'Weight', units: ['grams', 'kg', 'lbs'] },
  { label: 'Energy', units: ['kcal'] },
]
export const ALL_UNITS = UNIT_GROUPS.flatMap((group) => group.units)

// The select value meaning "the user typed their own" (for units)
export const CUSTOM = '__custom__'

// Amounts are stored with up to 2 decimal places.
export function roundAmount(value) {
  return Math.round(value * 100) / 100
}

// 2.5 → '2.5', 10000 → '10,000', 0.3 → '0.3'
export function formatAmount(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

// A habit's status for its current period (today, or this week for weekly
// habits). It decides the card's colour, so every habit with the same status
// looks the same.
export const STATUS = {
  'not-started': { label: 'Not started', colour: '#6c757d' }, // grey
  'in-progress': { label: 'In progress', colour: '#f59f00' }, // amber
  completed: { label: 'Completed', colour: '#198754' }, // green
}

export function habitStatus(habit) {
  if (habit.periodCount >= habit.target.amount) return 'completed'
  return habit.periodCount > 0 ? 'in-progress' : 'not-started'
}

// 'Today' / 'This week' — the period a habit's target applies to
export function periodLabel(habit) {
  return habit.frequency === 'weekly' ? 'This week' : 'Today'
}
