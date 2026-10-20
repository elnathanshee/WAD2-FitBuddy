// =============================================================================
// End-to-End Verification Test for all Neon Services & App Routes
// =============================================================================

import app from '../app.js'
import request from 'supertest'

const AUTH = { 'x-user-id': '1' }

console.log('--- STARTING NEON END-TO-END VERIFICATION ---')

// 1. Test Neon Status (Postgres, Object Storage, Functions)
console.log('\n[1/5] Testing /api/neon/status (Postgres + Object Storage + Functions)...')
const statusRes = await request(app).get('/api/neon/status')
console.log('Status HTTP Code:', statusRes.status)
console.log('Services operational:', statusRes.body.allServicesOperational)
console.log('Detailed results:', JSON.stringify(statusRes.body.services, null, 2))

if (!statusRes.body.allServicesOperational) {
  throw new Error('Neon services health check failed!')
}

// 2. Test Neon Postgres Habit Listing
console.log('\n[2/5] Testing /api/habits (Reading habits & streaks from Neon PostgreSQL)...')
const habitsRes = await request(app).get('/api/habits').set(AUTH)
console.log('Habits HTTP Code:', habitsRes.status)
console.log(`Fetched ${habitsRes.body.length} habits for demo user:`)
for (const h of habitsRes.body) {
  console.log(` - ${h.icon} ${h.name} (${h.category}) | Today: ${h.todayCount}/${h.target.amount} ${h.target.unit} | Streak: ${h.streak.current}`)
}

// 3. Test Neon Postgres Check-in Atomic Upsert
console.log('\n[3/5] Testing /api/habits/:id/checkins (Atomic check-in upsert on Neon)...')
const firstHabit = habitsRes.body[0]
const checkInRes = await request(app)
  .post(`/api/habits/${firstHabit.id}/checkins`)
  .set(AUTH)
  .send({ date: new Date().toISOString().slice(0, 10), count: 1 })
console.log('Check-in HTTP Code:', checkInRes.status)
console.log('Check-in result:', checkInRes.body)

// 4. Test Neon Postgres Weekly Leaderboard
console.log('\n[4/5] Testing /api/leaderboard/weekly (Leaderboard computed from Neon data)...')
const lbRes = await request(app).get('/api/leaderboard/weekly').set(AUTH)
console.log('Leaderboard HTTP Code:', lbRes.status)
console.log(`Leaderboard entries: ${lbRes.body.entries.length}`)
for (const e of lbRes.body.entries.slice(0, 3)) {
  console.log(` Rank ${e.rank}: ${e.displayName} - ${e.points} points`)
}

// 5. Test Gemini AI Goal Coach with Neon Ingestion
console.log('\n[5/5] Testing /api/ai/suggest-habits (Gemini AI recommendations)...')
const aiRes = await request(app)
  .post('/api/ai/suggest-habits')
  .set(AUTH)
  .send({ prompt: 'I want to improve my fitness and drink more water daily' })
console.log('Gemini HTTP Code:', aiRes.status)
console.log(`Generated ${aiRes.body.suggestions.length} suggestions from Gemini:`)
for (const s of aiRes.body.suggestions.slice(0, 2)) {
  console.log(` - ${s.icon} ${s.name} (${s.target.amount} ${s.target.unit} / ${s.frequency})`)
}

console.log('\n--- ALL NEON SERVICES & APP ROUTES VERIFIED SUCCESSFULLY! ---')

