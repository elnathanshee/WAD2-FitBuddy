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
