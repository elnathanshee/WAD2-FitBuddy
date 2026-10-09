// Seeds demo habits + 60 days of check-in history for the mock login user.
// Run from the server folder:  npm run seed
// Safe to re-run: it deletes and recreates ONLY the demo user's data.
//
// The patterns are fixed (no randomness) so the demo and tests look the same
// every time.
import mongoose from 'mongoose'
import { connectDB } from './config/db.js'
import Habit from './models/Habit.js'
import CheckIn from './models/CheckIn.js'
import { toDateKey, addDays } from './utils/dates.js'

// authService.login() in the frontend always returns { id: 1 }
const DEMO_USER_ID = '1'
const HISTORY_DAYS = 60

// Each habit has a `pattern(daysAgo)` that returns how much was logged that day
// (0 = nothing). daysAgo 0 is today.
const demoHabits = [
  {
    habit: {
      name: 'Morning run', category: 'exercise', frequency: 'daily',
      target: { amount: 1, unit: 'run' }, icon: 'bi-person-walking', colour: '#198754',
    },
    // Current streak of 6 (yesterday back to 6 days ago; today not done yet),
    // plus an older 12-day run so "longest" > "current".
    pattern: (d) => (d >= 1 && d <= 6) || (d >= 20 && d <= 31) ? 1 : 0,
  },
  {
    habit: {
      name: 'Drink water', category: 'water', frequency: 'daily',
      target: { amount: 8, unit: 'glasses' }, icon: 'bi-droplet', colour: '#0dcaf0',
    },
    // Done today. Some days are only partial (e.g. 5/8 glasses), which do NOT count as complete.
    pattern: (d) => (d % 5 === 3 ? 5 : 8),
  },
  {
    habit: {
      name: 'Sleep by 11pm', category: 'sleep', frequency: 'daily',
      target: { amount: 1, unit: 'night' }, icon: 'bi-moon-stars', colour: '#6f42c1',
    },
    // Misses every weekend-ish (every 6th & 7th day).
    pattern: (d) => (d % 7 === 5 || d % 7 === 6 ? 0 : 1),
  },
  {
    habit: {
      name: 'Study session', category: 'study', frequency: 'weekly', timesPerWeek: 5,
      target: { amount: 2, unit: 'hours' }, icon: 'bi-book', colour: '#fd7e14',
    },
    pattern: (d) => (d % 7 < 5 ? 2 : 0),
  },
  {
    habit: {
      name: 'Stretch', category: 'exercise', frequency: 'daily',
      target: { amount: 10, unit: 'minutes' }, icon: 'bi-heart-pulse', colour: '#dc3545',
    },
    // Brand-new habit with no history, to show the empty state.
    pattern: () => 0,
  },
]

await connectDB(process.env.MONGODB_URI)

await CheckIn.deleteMany({ userId: DEMO_USER_ID })
await Habit.deleteMany({ userId: DEMO_USER_ID })

const today = toDateKey()
let checkInCount = 0

for (const { habit, pattern } of demoHabits) {
  const created = await Habit.create({ ...habit, userId: DEMO_USER_ID })

  const checkIns = []
  for (let daysAgo = 0; daysAgo < HISTORY_DAYS; daysAgo++) {
    const count = pattern(daysAgo)
    if (count > 0) {
      checkIns.push({ userId: DEMO_USER_ID, habitId: created._id, date: addDays(today, -daysAgo), count })
    }
  }
  await CheckIn.insertMany(checkIns)
  checkInCount += checkIns.length
}

console.log(`Seeded ${demoHabits.length} habits and ${checkInCount} check-ins for user "${DEMO_USER_ID}" (today = ${today}).`)
await mongoose.disconnect()
