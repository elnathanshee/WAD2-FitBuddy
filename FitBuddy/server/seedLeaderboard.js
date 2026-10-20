// Rival users for the weekly leaderboard, plus a display name for the demo
// user that seedData.js already creates.
//
// Everyone signs in as user "1" with the mock login, so without this the board
// would only ever have one row. These extras give it something to rank.
//
// Scoped on purpose: it only ever deletes the users it owns (ids 2-5), so it
// can never touch the demo user's habits or anyone else's data.
import Habit from './models/Habit.js'
import CheckIn from './models/CheckIn.js'
import User from './models/User.js'
import { addDays, toDateKey } from './utils/dates.js'

export const DEMO_USER_ID = '1'

// Profiles. The demo user is included so the board shows a name, not "User 1".
const PROFILES = [
  { userId: '1', displayName: 'Angus (you)', avatarColor: '#0F3263' },
  { userId: '2', displayName: 'Sanjana', avatarColor: '#C65D4E' },
  { userId: '3', displayName: 'Kaven', avatarColor: '#4C9A6A' },
  { userId: '4', displayName: 'David', avatarColor: '#B86E00' },
  { userId: '5', displayName: 'Matthew', avatarColor: '#6D2E46' },
]

const RIVAL_IDS = ['2', '3', '4', '5']
const HISTORY_DAYS = 40

// Fixed patterns (no randomness) so the demo board looks the same every run.
// `pattern(daysAgo)` returns how much was logged that day; 0 means nothing.
const RIVALS = [
  {
    userId: '2',
    habits: [
      { habit: { name: 'Meditate', category: 'other', frequency: 'daily', target: { amount: 1, unit: 'session' }, icon: '🧘' },
        pattern: (d) => (d <= 30 ? 1 : 0) }, // long unbroken run -> milestone bonuses
      { habit: { name: 'Drink water', category: 'water', frequency: 'daily', target: { amount: 8, unit: 'glasses' }, icon: '💧' },
        pattern: (d) => (d % 3 === 0 ? 8 : 4) },
    ],
  },
  {
    userId: '3',
    habits: [
      { habit: { name: 'Read', category: 'study', frequency: 'daily', target: { amount: 20, unit: 'pages' }, icon: '📖' },
        pattern: (d) => (d % 2 === 0 ? 25 : 0) },
    ],
  },
  {
    userId: '4',
    habits: [
      { habit: { name: 'Gym', category: 'exercise', frequency: 'weekly', target: { amount: 3, unit: 'sessions' }, icon: '🏋️' },
        pattern: (d) => (d % 2 === 0 ? 1 : 0) },
      { habit: { name: 'Sleep by 11pm', category: 'sleep', frequency: 'daily', target: { amount: 1, unit: 'night' }, icon: '🌙' },
        pattern: (d) => (d <= 4 ? 1 : 0) },
    ],
  },
  {
    userId: '5',
    habits: [
      { habit: { name: 'Evening walk', category: 'exercise', frequency: 'daily', target: { amount: 2, unit: 'km' }, icon: '🚶' },
        pattern: (d) => (d <= 1 ? 2.5 : 0) }, // only just started -> near the bottom
    ],
  },
]

export async function seedLeaderboardRivals() {
  const today = toDateKey()

  for (const profile of PROFILES) {
    await User.findOneAndUpdate({ userId: profile.userId }, profile, { upsert: true, setDefaultsOnInsert: true })
  }

  // Only ever clears the rivals this file owns.
  await CheckIn.deleteMany({ userId: { $in: RIVAL_IDS } })
  await Habit.deleteMany({ userId: { $in: RIVAL_IDS } })

  let habitCount = 0
  const checkIns = []

  for (const rival of RIVALS) {
    for (const { habit, pattern } of rival.habits) {
      const created = await Habit.create({ ...habit, userId: rival.userId })
      habitCount++
      for (let daysAgo = 0; daysAgo < HISTORY_DAYS; daysAgo++) {
        const count = pattern(daysAgo)
        if (count > 0) {
          checkIns.push({ userId: rival.userId, habitId: created._id, date: addDays(today, -daysAgo), count })
        }
      }
    }
  }

  if (checkIns.length > 0) await CheckIn.insertMany(checkIns)
  return { profiles: PROFILES.length, habits: habitCount, checkIns: checkIns.length }
}
