// =============================================================================
// [IS216 Project Addition: Neon PostgreSQL Seed Script]
// Usage: node --env-file-if-exists=.env seedNeon.js
// Seeds initial demo habits, 60 days of check-in history, and leaderboard rivals into Neon.
// =============================================================================

import { getDb, initNeonSchema } from './config/neon.js'
import { toDateKey, addDays } from './utils/dates.js'
import { hashPassword } from './utils/auth.js'

export const DEMO_USER_ID = '1'
const HISTORY_DAYS = 60

const demoHabits = [
  {
    habit: {
      name: 'Morning run',
      category: 'exercise',
      frequency: 'daily',
      target: { amount: 1, unit: 'run' },
      icon: '🏃',
    },
    pattern: (d) => ((d >= 1 && d <= 6) || (d >= 20 && d <= 31) ? 1 : 0),
  },
  {
    habit: {
      name: 'Drink water',
      category: 'water',
      frequency: 'daily',
      target: { amount: 8, unit: 'glasses' },
      icon: '💧',
    },
    pattern: (d) => (d % 5 === 3 ? 5 : 8),
  },
  {
    habit: {
      name: 'Sleep by 11pm',
      category: 'sleep',
      frequency: 'daily',
      target: { amount: 1, unit: 'night' },
      icon: '😴',
    },
    pattern: (d) => (d % 7 === 5 || d % 7 === 6 ? 0 : 1),
  },
  {
    habit: {
      name: 'Study session',
      category: 'study',
      frequency: 'weekly',
      target: { amount: 10, unit: 'hours' },
      icon: '📚',
    },
    pattern: (d) => (d % 7 < 5 ? 2 : 0),
  },
  {
    habit: {
      name: 'Stretch',
      category: 'exercise',
      frequency: 'daily',
      target: { amount: 10, unit: 'minutes' },
      icon: '🧘',
    },
    pattern: () => 0,
  },
]

const rivals = [
  { userId: 'rival_alex', name: 'Alex Tan', email: 'alex@fitbuddy.com', color: '#4CAF50' },
  { userId: 'rival_bernice', name: 'Bernice Lim', email: 'bernice@fitbuddy.com', color: '#FF9800' },
  { userId: 'rival_charlie', name: 'Charlie Wong', email: 'charlie@fitbuddy.com', color: '#9C27B0' },
  { userId: 'rival_david', name: 'David Lee', email: 'david@fitbuddy.com', color: '#2196F3' },
]

export async function seedNeon() {
  await initNeonSchema()
  const sql = getDb()

  console.log('Seeding Neon database...')

  // Clear demo user and rival data
  const allUserIds = [DEMO_USER_ID, ...rivals.map((r) => r.userId)]
  await sql`DELETE FROM check_ins WHERE user_id = ANY(${allUserIds})`
  await sql`DELETE FROM habits WHERE user_id = ANY(${allUserIds})`
  await sql`DELETE FROM users WHERE user_id = ANY(${allUserIds})`

  const defaultPasswordHash = hashPassword('password123')

  // Seed primary demo user profile
  await sql`
    INSERT INTO users (user_id, display_name, email, password_hash, avatar_color)
    VALUES (${DEMO_USER_ID}, 'You', 'demo@fitbuddy.com', ${defaultPasswordHash}, '#4F46E5')
  `

  // Seed rival athlete profiles
  for (const r of rivals) {
    await sql`
      INSERT INTO users (user_id, display_name, email, password_hash, avatar_color)
      VALUES (${r.userId}, ${r.name}, ${r.email}, ${defaultPasswordHash}, ${r.color})
    `
  }

  // Seed demo habits
  const today = toDateKey()
  let checkInsCount = 0

  for (const { habit, pattern } of demoHabits) {
    const inserted = await sql`
      INSERT INTO habits (user_id, name, category, frequency, target_amount, target_unit, icon)
      VALUES (${DEMO_USER_ID}, ${habit.name}, ${habit.category}, ${habit.frequency}, ${habit.target.amount}, ${habit.target.unit}, ${habit.icon})
      RETURNING id
    `
    const habitId = inserted[0].id

    for (let daysAgo = 0; daysAgo < HISTORY_DAYS; daysAgo++) {
      const count = pattern(daysAgo)
      if (count > 0) {
        const date = addDays(today, -daysAgo)
        await sql`
          INSERT INTO check_ins (user_id, habit_id, date, count)
          VALUES (${DEMO_USER_ID}, ${habitId}, ${date}, ${count})
        `
        checkInsCount++
      }
    }
  }

  // Seed rival habits & check-ins so leaderboard has rich weekly scores
  for (const r of rivals) {
    const inserted = await sql`
      INSERT INTO habits (user_id, name, category, frequency, target_amount, target_unit, icon)
      VALUES (${r.userId}, 'Daily Workout', 'exercise', 'daily', 30, 'mins', '🏋️')
      RETURNING id
    `
    const hid = inserted[0].id
    for (let daysAgo = 0; daysAgo < 7; daysAgo++) {
      await sql`
        INSERT INTO check_ins (user_id, habit_id, date, count)
        VALUES (${r.userId}, ${hid}, ${addDays(today, -daysAgo)}, 30)
      `
    }
  }

  console.log(`✅ Seeded ${demoHabits.length} habits and ${checkInsCount} check-ins for demo user, plus rivals!`)
}

// Run directly if invoked from CLI
if (process.argv[1]?.endsWith('seedNeon.js')) {
  try {
    await seedNeon()
    process.exit(0)
  } catch (err) {
    console.error('Error seeding Neon:', err)
    process.exit(1)
  }
}
