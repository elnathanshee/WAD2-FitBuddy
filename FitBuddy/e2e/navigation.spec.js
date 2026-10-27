// End-to-end tests for the app's page flow: login lands on Home, the tabs in
// the top bar reach every page, each page shows only its own content, and
// logout lives in the account menu.
import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

// The page tabs live in the top bar on every screen size
const navLink = (page, name) => page.getByTestId(`tab-${name}`)

test.beforeEach(async ({ page }) => {
  await login(page)
})

test.describe('Home page', () => {
  test('is the first page after login and shows habits, challenges and Google Health', async ({ page }) => {
    await expect(page).toHaveURL(/\/home$/)
    await expect(page.getByTestId('home-hero')).toBeVisible()
    await expect(page.getByTestId('home-habits')).toBeVisible()
    await expect(page.getByTestId('home-challenges')).toBeVisible()
    await expect(page.getByTestId('google-health')).toBeVisible()
  })

  test('the root URL opens Home when logged in', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/home$/)
  })

  test('has no duplicate navigation cards or logout button', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Open Habits' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'View Leaderboard' })).toHaveCount(0)
    await expect(page.locator('main').getByRole('button', { name: /log ?out/i })).toHaveCount(0)
  })

  test('the challenges section has a single "Start a challenge" button', async ({ page }) => {
    const challenges = page.getByTestId('home-challenges')
    await expect(challenges.getByRole('button', { name: 'Start a challenge' })).toHaveCount(1)
    await expect(challenges.getByRole('button', { name: /^new$/i })).toHaveCount(0)
  })

  test('the Google Health stats each have their own progress bar colour', async ({ page }) => {
    const card = page.getByTestId('google-health')
    const colours = []
    for (const key of ['steps', 'active', 'distance', 'calories']) {
      const bar = card.getByTestId(`health-${key}`).locator('.bar > span')
      await expect(bar).toHaveCount(1)
      colours.push(await bar.evaluate((el) => getComputedStyle(el).backgroundColor))
    }
    expect(new Set(colours).size).toBe(4)
  })

  test('Google Health sync lists the latest updates', async ({ page }) => {
    // Mock the (simulated) sync so the test doesn't change the demo user's check-ins
    await page.route('**/api/health-sync/simulate', (route) =>
      route.fulfill({
        json: {
          message: 'Successfully synchronized data from Google Health!',
          updatedHabits: [{ id: 1, name: 'Morning run', syncedCount: 1, unit: 'run' }],
        },
      }),
    )
    const card = page.getByTestId('google-health')
    await card.getByTestId('health-sync-btn').click()
    await expect(card.getByTestId('health-updates')).toBeVisible()
    await expect(card.getByTestId('health-updates').locator('li').first()).toContainText('steps')
    await expect(card.getByTestId('health-updates')).toContainText('Morning run: logged 1 run')
  })
})

test.describe('Navigation', () => {
  test('reaches every page from the main navigation', async ({ page }) => {
    await navLink(page, 'habits').click()
    await expect(page).toHaveURL(/\/habits$/)
    await expect(page.getByRole('heading', { name: 'My habits' })).toBeVisible()

    await navLink(page, 'dashboard').click()
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByTestId('analytics-dashboard')).toBeVisible()

    await navLink(page, 'leaderboard').click()
    await expect(page).toHaveURL(/\/leaderboard$/)
    await expect(page.getByRole('heading', { name: 'Leaderboard' })).toBeVisible()

    await navLink(page, 'friends').click()
    await expect(page).toHaveURL(/\/friends$/)
    await expect(page.getByRole('heading', { name: 'Friends', level: 1 })).toBeVisible()

    await navLink(page, 'home').click()
    await expect(page).toHaveURL(/\/home$/)
  })

  test('the page tabs sit inside the top bar on every page, equally wide', async ({ page }) => {
    for (const path of ['/home', '/habits', '/dashboard', '/leaderboard', '/friends']) {
      await page.goto(path)
      const navbar = await page.getByTestId('navbar').boundingBox()
      const bar = page.getByTestId('tabbar')
      await expect(bar).toBeVisible()
      const box = await bar.boundingBox()
      expect(box.y).toBeGreaterThanOrEqual(navbar.y)
      expect(box.y + box.height).toBeLessThanOrEqual(navbar.y + navbar.height + 1) // inside the top bar
      const links = bar.getByRole('link')
      await expect(links).toHaveCount(5)
      const widths = await links.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width))
      expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1) // equal spacing
    }
  })

  test('log out is in the account menu and returns to login', async ({ page }) => {
    await page.getByTestId('account-menu-btn').click()
    await page.getByTestId('logout-btn').click()
    await expect(page).toHaveURL(/\/login$/)

    // Protected pages now redirect to login
    await page.goto('/home')
    await expect(page).toHaveURL(/\/login$/)
  })
})

test.describe('Dashboard', () => {
  test('shows only statistics, charts and streaks', async ({ page }) => {
    await page.goto('/dashboard')
    const analytics = page.getByTestId('analytics-dashboard')
    await expect(analytics).toBeVisible()
    await expect(analytics.getByTestId('analytics-rate')).toBeVisible()
    await expect(analytics.getByTestId('analytics-current-streak')).toContainText('day')
    await expect(analytics.getByTestId('analytics-completed')).toBeVisible()
    await expect(analytics).not.toContainText('Perfect days')
    await expect(analytics).toContainText('High score:')

    // Home-only sections are not on the Dashboard any more
    await expect(page.getByTestId('google-health')).toHaveCount(0)
    await expect(page.getByTestId('home-challenges')).toHaveCount(0)
    await expect(page.locator('main').getByRole('button', { name: /log ?out/i })).toHaveCount(0)
  })

  test('month view sections are in order: calendar, trend, habits & streaks, activity', async ({ page }) => {
    await page.goto('/dashboard')
    const headings = page.getByTestId('analytics-dashboard').locator('h2.section-title')
    await expect(headings.first()).toBeVisible()
    await expect(headings).toHaveText(['Month at a glance', 'Daily completion trend', 'Habits & streaks', 'Activity by category'])
  })

  test('the month calendar uses three colours and fits small screens', async ({ page }) => {
    await page.goto('/dashboard')
    const heatmap = page.getByTestId('monthly-heatmap')
    await expect(heatmap).toBeVisible()
    // Every coloured day is one of: none (0), some (1), all (2) done
    const levels = await heatmap.getByTestId('heatmap-day').evaluateAll((cells) =>
      [...new Set(cells.map((c) => c.dataset.level))],
    )
    for (const level of levels) expect(['-1', '0', '1', '2']).toContain(level)
    // Never wider than the page (no horizontal scroll)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
