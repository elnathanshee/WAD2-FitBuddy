/**
 * Seeds demo data so the leaderboard has something to show.
 *
 * Deliberately reuses the real pointsService rather than inserting made-up
 * point totals, so seeded scores are produced by exactly the same rules that
 * run in the live app — there is no separate "fake data" path that could drift
 * from how scoring actually behaves.
 *
 * Run with:  npm run seed
 */
require('dotenv').config()
const mongoose = require('mongoose')
const User = require('./models/User')
const Habit = require('./models/Habit')
const CheckIn = require('./models/CheckIn')
const PointTransaction = require('./models/PointTransaction')
const { awardForCheckIn } = require('./services/pointsService')
const { todayStr, addDays, mondayOf } = require('./services/dateUtils')

const PEOPLE = [
  { displayName: 'Angus',    email: 'angus@fitbuddy.dev',    avatarColor: '#1B3A6B' },
  { displayName: 'Elnathan', email: 'elnathan@fitbuddy.dev', avatarColor: '#C65D4E' },
  { displayName: 'Sanjana',  email: 'sanjana@fitbuddy.dev',  avatarColor: '#7FA3D1' },
  { displayName: 'Kaven',    email: 'kaven@fitbuddy.dev',    avatarColor: '#4C9A6A' },
  { displayName: 'David',    email: 'david@fitbuddy.dev',    avatarColor: '#B86E00' },
  { displayName: 'Matthew',  email: 'matthew@fitbuddy.dev',  avatarColor: '#7A4FA3' },
]

const HABITS = {
  Angus:    ['Drink 2L Water', 'Morning Run'],
  Elnathan: ['Gym Session', 'Study 1 Hour'],
  Sanjana:  ['Meditate', 'Sleep by 11pm'],
  Kaven:    ['Read 20 Pages'],
  David:    ['Stretch', 'Walk 8k Steps'],
  Matthew:  ['Journal'],
}

// Deterministic completion patterns, so re-seeding gives the same demo board.
// offset 0 = 13 days ago, offset 13 = today.
const PATTERN = {
  Angus:    () => true,                 // perfect run — shows the streak bonus firing
  Elnathan: (o) => o % 4 !== 3,
  Sanjana:  (o) => o >= 7,
  Kaven:    (o) => o % 2 === 0,
  David:    (o) => o % 3 !== 0,
  Matthew:  (o) => o > 10,
}

const DAYS = 14

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Copy .env.example to .env first.')
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected. Clearing existing demo data...')

  await Promise.all([
    User.deleteMany({}),
    Habit.deleteMany({}),
    CheckIn.deleteMany({}),
    PointTransaction.deleteMany({}),
  ])

  const users = {}
  for (const p of PEOPLE) {
    users[p.displayName] = await User.create(p)
  }
  console.log(`Created ${PEOPLE.length} users.`)

  const habits = {}
  for (const p of PEOPLE) {
    habits[p.displayName] = []
    for (const name of HABITS[p.displayName]) {
      habits[p.displayName].push(await Habit.create({ userId: users[p.displayName]._id, name }))
    }
  }
  console.log('Created habits.')

  const today = todayStr()
  let checkInCount = 0

  for (const p of PEOPLE) {
    const name = p.displayName
    // Walk day by day, then habit by habit, so the "all habits done today"
    // bonus is evaluated against the same state the live app would see.
    for (let offset = 0; offset < DAYS; offset++) {
      if (!PATTERN[name](offset)) continue
      const date = addDays(today, -(DAYS - 1 - offset))
      for (const habit of habits[name]) {
        try {
          await CheckIn.create({ habitId: habit._id, userId: users[name]._id, date })
          await awardForCheckIn({ userId: users[name]._id, habitId: habit._id, date })
          checkInCount++
        } catch (err) {
          if (err.code !== 11000) throw err
        }
      }
    }
  }

  console.log(`Created ${checkInCount} check-ins with points awarded.`)

  const thisWeek = mondayOf(today)
  const totals = await PointTransaction.aggregate([
    { $match: { weekStart: thisWeek } },
    { $group: { _id: '$userId', total: { $sum: '$points' } } },
    { $sort: { total: -1 } },
  ])

  console.log(`\nThis week (from ${thisWeek}):`)
  for (const t of totals) {
    const person = PEOPLE.find((p) => String(users[p.displayName]._id) === String(t._id))
    console.log(`  ${String(person.displayName).padEnd(10)} ${t.total} pts`)
  }

  console.log('\nSeed complete.')
  console.log('User IDs (use as the x-user-id header until auth is wired up):')
  for (const p of PEOPLE) {
    console.log(`  ${p.displayName.padEnd(10)} ${users[p.displayName]._id}`)
  }

  await mongoose.disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await mongoose.disconnect()
  process.exit(1)
})
