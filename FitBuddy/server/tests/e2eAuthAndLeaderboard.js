// =============================================================================
// [Test Script: End-to-End Verification of Real Auth & Social Leaderboard]
// Usage: node --env-file-if-exists=.env.local server/tests/e2eAuthAndLeaderboard.js
// =============================================================================

import supertest from 'supertest'
import app from '../app.js'
import { initNeonSchema } from '../config/neon.js'

async function run() {
  console.log('--- STARTING AUTH & LEADERBOARD END-TO-END VERIFICATION ---')
  await initNeonSchema()
  const request = supertest(app)

  // 1. Test Demo User Login
  console.log('\n[1/6] Testing POST /api/auth/login for demo user...')
  const loginRes = await request
    .post('/api/auth/login')
    .send({ email: 'demo@fitbuddy.com', password: 'password123' })
  console.log('Login status:', loginRes.status)
  console.log('User logged in:', loginRes.body.user)
  if (loginRes.status !== 200 || !loginRes.body.token) {
    throw new Error('Demo login failed!')
  }
  const demoToken = loginRes.body.token

  // 2. Test Invalid Password
  console.log('\n[2/6] Testing POST /api/auth/login with wrong password...')
  const badLogin = await request
    .post('/api/auth/login')
    .send({ email: 'demo@fitbuddy.com', password: 'wrongpassword' })
  console.log('Bad login status (expected 401):', badLogin.status)
  if (badLogin.status !== 401) throw new Error('Expected 401 for wrong password')

  // 3. Test New User Registration & Auto-bootstrapping habits
  console.log('\n[3/6] Testing POST /api/auth/signup for new unique user...')
  const testEmail = `runner_${Date.now()}@fitbuddy.com`
  const signupRes = await request
    .post('/api/auth/signup')
    .send({ name: 'Sam Runner', email: testEmail, password: 'securePassword123' })
  console.log('Signup status (expected 201):', signupRes.status)
  console.log('New user created:', signupRes.body.user)
  if (signupRes.status !== 201 || !signupRes.body.token) {
    throw new Error('Signup failed!')
  }
  const newUserToken = signupRes.body.token
  const newUserId = signupRes.body.user.id

  // 4. Test GET /api/habits for the new user (should have bootstrapped starter habits)
  console.log('\n[4/6] Verifying bootstrapped starter habits for new user...')
  const habitsRes = await request
    .get('/api/habits')
    .set('Authorization', `Bearer ${newUserToken}`)
  console.log('Habits status:', habitsRes.status)
  console.log(`New user has ${habitsRes.body.length} starter habits:`, habitsRes.body.map(h => h.name))
  if (habitsRes.status !== 200 || habitsRes.body.length === 0) {
    throw new Error('Bootstrapping habits failed!')
  }

  // 5. Test Social Cheer from New User to Demo User
  console.log('\n[5/6] Testing POST /api/leaderboard/cheer (New user cheers Demo user)...')
  const cheerRes = await request
    .post('/api/leaderboard/cheer')
    .set('Authorization', `Bearer ${newUserToken}`)
    .send({ recipientId: '1', type: 'cheer', message: 'Keep crushing it!' })
  console.log('Cheer status (expected 200):', cheerRes.status, cheerRes.body)
  if (cheerRes.status !== 200) throw new Error('Sending cheer failed!')

  // 6. Test GET /api/leaderboard/cheers for Demo User (should see cheer from Sam)
  console.log('\n[6/6] Verifying cheer inbox for demo user...')
  const inboxRes = await request
    .get('/api/leaderboard/cheers')
    .set('Authorization', `Bearer ${demoToken}`)
  console.log('Inbox status:', inboxRes.status)
  console.log('Cheers received:', inboxRes.body.cheers.map(c => `${c.sender_name} (${c.type})`))
  if (inboxRes.status !== 200 || inboxRes.body.cheers.length === 0) {
    throw new Error('Cheer inbox failed!')
  }

  console.log('\n--- ALL AUTH & LEADERBOARD END-TO-END TESTS PASSED PERFECTLY! ---')
}

run().catch((err) => {
  console.error('Test error:', err)
  process.exit(1)
})

