export const GOAL_OPTIONS = [
  { value: 'wellness', label: 'Feel healthier overall', targetLabel: '' },
  { value: 'weight-loss', label: 'Lose weight', targetLabel: 'My target (optional, e.g. 0.5 kg per week)' },
  { value: 'muscle-gain', label: 'Build muscle', targetLabel: 'My target (optional)' },
  { value: 'cardio', label: 'Improve cardio fitness', targetLabel: '' },
  { value: 'strength', label: 'Build strength', targetLabel: '' },
  { value: 'mobility', label: 'Improve flexibility and mobility', targetLabel: '' },
  { value: 'sleep', label: 'Improve sleep and recovery', targetLabel: '' },
]

export const GOAL_HABITS = {
  wellness: [
    { name: 'Drink water', category: 'water', frequency: 'daily', target: { amount: 8, unit: 'glasses' }, icon: '💧' },
    { name: 'Take a mindful break', category: 'other', frequency: 'daily', target: { amount: 10, unit: 'minutes' }, icon: '🌿' },
    { name: 'Go for a walk', category: 'exercise', frequency: 'daily', target: { amount: 20, unit: 'minutes' }, icon: '🚶' },
  ],
  'weight-loss': [
    { name: 'Take a brisk walk', category: 'exercise', frequency: 'daily', target: { amount: 30, unit: 'minutes' }, icon: '🚶' },
    { name: 'Drink water', category: 'water', frequency: 'daily', target: { amount: 8, unit: 'glasses' }, icon: '💧' },
    { name: 'Log a balanced meal', category: 'other', frequency: 'daily', target: { amount: 1, unit: 'times' }, icon: '🥗' },
  ],
  'muscle-gain': [
    { name: 'Strength training', category: 'exercise', frequency: 'daily', target: { amount: 1, unit: 'times' }, icon: '🏋️' },
    { name: 'Eat a protein-rich meal', category: 'other', frequency: 'daily', target: { amount: 1, unit: 'times' }, icon: '🍽️' },
    { name: 'Sleep well', category: 'sleep', frequency: 'daily', target: { amount: 8, unit: 'hours' }, icon: '😴' },
  ],
  cardio: [
    { name: 'Cardio workout', category: 'exercise', frequency: 'daily', target: { amount: 30, unit: 'minutes' }, icon: '❤️‍🔥' },
    { name: 'Take a brisk walk', category: 'exercise', frequency: 'daily', target: { amount: 20, unit: 'minutes' }, icon: '🚶' },
    { name: 'Stretch', category: 'exercise', frequency: 'daily', target: { amount: 5, unit: 'minutes' }, icon: '🧘' },
  ],
  strength: [
    { name: 'Strength training', category: 'exercise', frequency: 'daily', target: { amount: 1, unit: 'times' }, icon: '🏋️' },
    { name: 'Warm up', category: 'exercise', frequency: 'daily', target: { amount: 5, unit: 'minutes' }, icon: '🔥' },
    { name: 'Stretch', category: 'exercise', frequency: 'daily', target: { amount: 5, unit: 'minutes' }, icon: '🧘' },
  ],
  mobility: [
    { name: 'Morning stretch', category: 'exercise', frequency: 'daily', target: { amount: 10, unit: 'minutes' }, icon: '🧘' },
    { name: 'Take a movement break', category: 'exercise', frequency: 'daily', target: { amount: 5, unit: 'minutes' }, icon: '🤸' },
    { name: 'Practice yoga', category: 'exercise', frequency: 'daily', target: { amount: 15, unit: 'minutes' }, icon: '🌱' },
  ],
  sleep: [
    { name: 'Keep a bedtime routine', category: 'sleep', frequency: 'daily', target: { amount: 1, unit: 'times' }, icon: '🌙' },
    { name: 'Avoid screens before bed', category: 'sleep', frequency: 'daily', target: { amount: 30, unit: 'minutes' }, icon: '📵' },
    { name: 'Get morning daylight', category: 'other', frequency: 'daily', target: { amount: 10, unit: 'minutes' }, icon: '☀️' },
  ],
}
