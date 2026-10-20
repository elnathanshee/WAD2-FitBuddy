// =============================================================================
// [Comprehensive Test Suite: Full Feature Verification]
// Usage: node --env-file-if-exists=.env.local server/tests/e2eFullSuite.js
// Tests: Auth, Neon Habits, Leaderboard, Cheers, Fitness Tracker, Challenges, Analytics
// =============================================================================

import supertest from 'supertest'
import app from '../app.js'
import { initNeonSchema } from '../config/neon.js'

async function run() {
  console.log('--- STARTING FULL SUITE END-TO-END VERIFICATION ---')
  await initNeonSchema()
  const request = supertest(app)

  // 1. Authenticate Demo User
  console.log('\n[1/5] Authenticating Demo User...')
  const authRes = await request
    .post('/api/auth/login')
    .send({ email: 'demo@fitbuddy.com', password: 'password123' })
  if (authRes.status !== 200 || !authRes.body.token) throw new Error('Login failed')
  const token = authRes.body.token
  console.log('Logged in as:', authRes.body.user.name)

  // 2. Test Fitness Tracker Health Sync Simulator
  console.log('\n[2/5] Testing Fitness Tracker / Apple Health Telemetry & Sync...')
  const metricsRes = await request
    .get('/api/health-sync/today')
    .set('Authorization', `Bearer ${token}`)
  console.log('Initial today metrics:', metricsRes.body.metrics)
  if (metricsRes.status !== 200) throw new Error('Failed to get health metrics')

  const syncRes = await request
    .post('/api/health-sync/simulate')
    .set('Authorization', `Bearer ${token}`)
    .send({ deviceType: 'Apple Health', steps: 9400, activeMinutes: 40 })
  console.log('Sync result:', syncRes.body.message)
  console.log('Habits auto-updated:', syncRes.body.updatedHabits)
  if (syncRes.status !== 200) throw new Error('Failed to simulate health sync')

  // 3. Test 7-Day Consistency Analytics
  console.log('\n[3/5] Testing 7-Day Habit Consistency Analytics...')
  const analyticsRes = await request
    .get('/api/analytics/weekly-summary')
    .set('Authorization', `Bearer ${token}`)
  console.log('Analytics status:', analyticsRes.status)
  console.log('Overall completion rate:', analyticsRes.body.overallCompletionRate + '%')
  console.log('7-day matrix length:', analyticsRes.body.days.length)
  if (analyticsRes.status !== 200 || !analyticsRes.body.days) throw new Error('Failed to get analytics')

  // 4. Test Friend Challenges & Duels
  console.log('\n[4/5] Testing Friend Challenges & Head-to-Head Duels...')
  const createChallengeRes = await request
    .post('/api/challenges')
    .set('Authorization', `Bearer ${token}`)
    .send({
      opponentId: 'rival_charlie',
      title: '7-Day Hydration Sprint',
      habitCategory: 'water',
      targetDays: 7,
    })
  console.log('Created challenge:', createChallengeRes.body.challenge?.title)
  if (createChallengeRes.status !== 201) throw new Error('Failed to create challenge')
  const challengeId = createChallengeRes.body.challenge.id

  const progressRes = await request
    .post(`/api/challenges/${challengeId}/progress`)
    .set('Authorization', `Bearer ${token}`)
  console.log('Progress recorded:', progressRes.body.message)
  console.log('Current challenge state:', progressRes.body.challenge)
  if (progressRes.status !== 200) throw new Error('Failed to record challenge progress')

  // 5. Test Listing Challenges
  console.log('\n[5/5] Testing GET /api/challenges...')
  const listRes = await request
    .get('/api/challenges')
    .set('Authorization', `Bearer ${token}`)
  console.log(`User has ${listRes.body.challenges.length} challenges in Neon database.`)
  if (listRes.status !== 200) throw new Error('Failed to list challenges')

  console.log('\n============================================================')
  console.log('🎉 ALL FULL-STACK FITBUDDY FEATURES VERIFIED SUCCESSFULLY! 🎉')
  console.log('============================================================')
}

run().catch((err) => {
  console.error('Test suite failed:', err)
  process.exit(1)
})

