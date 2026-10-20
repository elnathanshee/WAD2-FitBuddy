import path from 'node:path'
import fs from 'node:fs'
import express from 'express'
import app from '../server/app.js'
import pkg from '../FitBuddy/node_modules/@playwright/test/index.js'
import { initNeonSchema } from '../server/config/neon.js'

const { chromium } = pkg

const PORT = 3899
const OUTPUT_DIR = 'C:/Users/User/.gemini/antigravity/brain/e39303b1-e01c-4b42-9051-e33396e91ffb/screenshots'
fs.mkdirSync(OUTPUT_DIR, { recursive: true })

async function capture() {
  console.log('Connecting to Neon PostgreSQL schema...')
  await initNeonSchema()

  // Clean dual server serving: frontend dist + backend api
  const mainApp = express()
  mainApp.use(express.static(path.resolve('FitBuddy/dist')))
  mainApp.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return app(req, res, next)
    }
    res.sendFile(path.resolve('FitBuddy/dist/index.html'))
  })

  const server = mainApp.listen(PORT, async () => {
    console.log(`Test capture server running on http://localhost:${PORT}`)
  })

  let browser
  try {
    console.log('Launching browser...')
    browser = await chromium.launch({
      channel: 'msedge',
      headless: true,
    })

    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 2, // High resolution retina screenshots
    })

    const page = await context.newPage()

    // 1. Capture Login Page
    console.log('[1/5] Capturing Login Page...')
    await page.goto(`http://localhost:${PORT}/login`, { waitUntil: 'networkidle' })
    await page.waitForSelector('#email', { timeout: 15000 })
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(OUTPUT_DIR, '01_login_page.png'), fullPage: false })

    // Perform Login via Demo Athlete button
    console.log('[2/5] Logging in as Demo Athlete...')
    const demoBtn = page.locator('button:has-text("You (Demo)")')
    if (await demoBtn.count() > 0) {
      await demoBtn.first().click()
    } else {
      await page.fill('#email', 'demo@fitbuddy.com')
      await page.fill('#password', 'password123')
      await page.click('button[type="submit"]')
    }

    await page.waitForURL(`**/dashboard`, { timeout: 15000 })
    await page.waitForTimeout(1500)

    // 2. Capture Dashboard
    console.log('[3/5] Capturing Dashboard with Health Tracker, Consistency Matrix & Challenges...')
    await page.screenshot({ path: path.join(OUTPUT_DIR, '02_dashboard_overview.png'), fullPage: false })

    // Simulate clicking Sync Apple Health
    const syncBtn = page.locator('button:has-text("Sync Apple Health")')
    if (await syncBtn.isVisible()) {
      await syncBtn.click()
      await page.waitForTimeout(1500)
      await page.screenshot({ path: path.join(OUTPUT_DIR, '03_health_sync_active.png'), fullPage: false })
    }

    // 3. Capture Habits Tracker Page
    console.log('[4/5] Capturing Habits Page...')
    await page.goto(`http://localhost:${PORT}/habits`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(OUTPUT_DIR, '04_habits_page.png'), fullPage: false })

    // Open Gemini AI Goal Coach Modal
    const aiBtn = page.locator('button:has-text("AI Goal Coach")')
    if (await aiBtn.isVisible()) {
      console.log('[4.5/5] Opening and Capturing Gemini AI Goal Coach Modal...')
      await aiBtn.click()
      await page.waitForTimeout(1200)
      await page.screenshot({ path: path.join(OUTPUT_DIR, '05_gemini_ai_coach.png'), fullPage: false })
      // Close modal
      const closeBtn = page.locator('.modal.show button.btn-close')
      if (await closeBtn.isVisible()) {
        await closeBtn.click()
      } else {
        await page.keyboard.press('Escape')
      }
      await page.waitForTimeout(500)
    }

    // 4. Capture Leaderboard Page
    console.log('[5/5] Capturing Weekly Leaderboard...')
    await page.goto(`http://localhost:${PORT}/leaderboard`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)
    await page.screenshot({ path: path.join(OUTPUT_DIR, '06_leaderboard.png'), fullPage: false })

    console.log('✅ All screenshots captured and saved to:', OUTPUT_DIR)
  } catch (err) {
    console.error('Error during screenshot capture:', err)
  } finally {
    if (browser) await browser.close()
    server.close(() => {
      console.log('Server stopped.')
      process.exit(0)
    })
  }
}

capture()
