import app from '../server/app.js'
import { initNeonSchema } from '../server/config/neon.js'

const PORT = 3888

async function verifyAll() {
  console.log('--- FITBUDDY FULL SYSTEM HEALTH & ENDPOINT VERIFICATION ---')
  console.log('1. Verifying Neon PostgreSQL Connection & Schema...')
  await initNeonSchema()
  console.log('   ✅ Neon schema initialized and connected.')

  const server = app.listen(PORT, async () => {
    try {
      const baseUrl = `http://localhost:${PORT}`

      // Test 1: Health check
      console.log('2. Testing GET /api/health...')
      const healthRes = await fetch(`${baseUrl}/api/health`)
      const healthData = await healthRes.json()
      if (healthRes.ok && healthData.status === 'ok') {
        console.log('   ✅ GET /api/health passed:', healthData)
      } else {
        throw new Error('Health check failed: ' + JSON.stringify(healthData))
      }

      // Test 2: Demo users endpoint
      console.log('3. Testing GET /api/auth/demo-users...')
      const demoRes = await fetch(`${baseUrl}/api/auth/demo-users`)
      const demoData = await demoRes.json()
      if (demoRes.ok && Array.isArray(demoData.demoAccounts) && demoData.demoAccounts.length >= 5) {
        console.log(`   ✅ GET /api/auth/demo-users passed: Found ${demoData.demoAccounts.length} seeded test athletes`)
      } else {
        throw new Error('Demo users endpoint failed: ' + JSON.stringify(demoData))
      }

      // Test 3: Authentication login
      console.log('4. Testing POST /api/auth/login with demo athlete...')
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@fitbuddy.com', password: 'password123' })
      })
      const loginData = await loginRes.json()
      if (!loginRes.ok || !loginData.token) {
        throw new Error('Login failed: ' + JSON.stringify(loginData))
      }
      console.log(`   ✅ POST /api/auth/login passed! User: ${loginData.user.name} (${loginData.user.email})`)
      const token = loginData.token
      const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }

      // Test 4: Auth me endpoint
      console.log('5. Testing GET /api/auth/me...')
      const meRes = await fetch(`${baseUrl}/api/auth/me`, { headers: authHeaders })
      const meData = await meRes.json()
      if (meRes.ok && meData.user && meData.user.email === 'demo@fitbuddy.com') {
        console.log(`   ✅ GET /api/auth/me passed! Authenticated as ${meData.user.name}`)
      } else {
        throw new Error('Auth me failed: ' + JSON.stringify(meData))
      }

      // Test 5: Habits retrieval
      console.log('6. Testing GET /api/habits...')
      const habitsRes = await fetch(`${baseUrl}/api/habits`, { headers: authHeaders })
      const habitsData = await habitsRes.json()
      if (habitsRes.ok && Array.isArray(habitsData)) {
        console.log(`   ✅ GET /api/habits passed! Found ${habitsData.length} habits for user.`)
      } else {
        throw new Error('Get habits failed: ' + JSON.stringify(habitsData))
      }

      // Test 6: Leaderboard retrieval
      console.log('7. Testing GET /api/leaderboard/weekly...')
      const lbRes = await fetch(`${baseUrl}/api/leaderboard/weekly`, { headers: authHeaders })
      const lbData = await lbRes.json()
      if (lbRes.ok && Array.isArray(lbData.entries)) {
        console.log(`   ✅ GET /api/leaderboard/weekly passed! Leaderboard has ${lbData.entries.length} athletes ranked. Top 1: ${lbData.entries[0]?.displayName || 'N/A'}`)
      } else {
        throw new Error('Get leaderboard failed: ' + JSON.stringify(lbData))
      }

      // Test 7: Wearable Health Sync Simulation
      console.log('8. Testing POST /api/health-sync/simulate (Apple Health / Google Fit)...')
      const syncRes = await fetch(`${baseUrl}/api/health-sync/simulate`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ provider: 'Apple Health' })
      })
      const syncData = await syncRes.json()
      if (syncRes.ok && syncData.metrics) {
        console.log(`   ✅ POST /api/health-sync/simulate passed! Synced: ${syncData.metrics.steps} steps, ${syncData.metrics.activeMinutes} mins, ${syncData.metrics.caloriesBurned} kcal`)
      } else {
        throw new Error('Health sync failed: ' + JSON.stringify(syncData))
      }

      // Test 8: Weekly Analytics Matrix
      console.log('9. Testing GET /api/analytics/weekly-summary...')
      const analyticsRes = await fetch(`${baseUrl}/api/analytics/weekly-summary`, { headers: authHeaders })
      const analyticsData = await analyticsRes.json()
      if (analyticsRes.ok && Array.isArray(analyticsData.days)) {
        console.log(`   ✅ GET /api/analytics/weekly-summary passed! 7-day matrix days: ${analyticsData.days.length}, overall rate: ${analyticsData.overallCompletionRate}%`)
      } else {
        throw new Error('Analytics failed: ' + JSON.stringify(analyticsData))
      }

      // Test 9: Friend Challenges
      console.log('10. Testing GET /api/challenges...')
      const chalRes = await fetch(`${baseUrl}/api/challenges`, { headers: authHeaders })
      const chalData = await chalRes.json()
      if (chalRes.ok && Array.isArray(chalData.challenges)) {
        console.log(`   ✅ GET /api/challenges passed! Challenges count: ${chalData.challenges.length}`)
      } else {
        throw new Error('Challenges failed: ' + JSON.stringify(chalData))
      }

      // Test 10: Social Cheer
      console.log('11. Testing POST /api/leaderboard/cheer...')
      const cheerRes = await fetch(`${baseUrl}/api/leaderboard/cheer`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          recipientId: 'rival_alex',
          type: 'fire',
          message: 'Crushing it in testing!'
        })
      })
      const cheerData = await cheerRes.json()
      if (cheerRes.ok && cheerData.success) {
        console.log('   ✅ POST /api/leaderboard/cheer passed! Cheer recorded:', cheerData.message)
      } else if (cheerRes.status === 409) {
        // Each cheer type can only be sent once per person per day
        console.log('   ✅ POST /api/leaderboard/cheer passed! Daily limit enforced:', cheerData.message)
      } else {
        throw new Error('Cheer failed: ' + JSON.stringify(cheerData))
      }

      console.log('\n======================================================')
      console.log('🎉 ALL 11 VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉')
      console.log('======================================================\n')
    } catch (err) {
      console.error('\n❌ VERIFICATION TEST FAILED:', err)
      process.exitCode = 1
    } finally {
      server.close(() => {
        console.log('Verification server closed.')
        process.exit(process.exitCode || 0)
      })
    }
  })
}

verifyAll()
