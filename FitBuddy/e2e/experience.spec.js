// End-to-end tests for the interactive layer: the highlights carousel, the
// background picker, the 3D models and page titles.
import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await login(page)
})

test.describe('Highlights carousel (Home)', () => {
  test('next / previous buttons and dots move between slides', async ({ page }) => {
    const carousel = page.getByTestId('highlights-carousel')
    await expect(carousel.getByTestId('carousel-slide').first()).toBeVisible()
    await expect(carousel).toHaveAttribute('data-active-index', '0')

    await carousel.getByTestId('carousel-next').click()
    await expect(carousel).toHaveAttribute('data-active-index', '1')
    await carousel.getByTestId('carousel-prev').click()
    await expect(carousel).toHaveAttribute('data-active-index', '0')

    await carousel.getByTestId('carousel-dot').nth(2).click()
    await expect(carousel).toHaveAttribute('data-active-index', '2')
    await expect(carousel.getByTestId('carousel-dot').nth(2)).toHaveAttribute('aria-selected', 'true')
  })

  test('advances on its own, and pauses while hovered', async ({ page }) => {
    const carousel = page.getByTestId('highlights-carousel')
    await expect(carousel.getByTestId('carousel-slide').first()).toBeVisible()
    await page.mouse.move(0, 0) // pointer away from the carousel

    // Autoplay interval is 4.5 s
    await expect(carousel).toHaveAttribute('data-active-index', '1', { timeout: 7000 })

    await page.waitForTimeout(800) // let the slide finish scrolling into place
    // Hover the carousel's heading (hovering a slide would make Playwright scroll the track)
    await carousel.getByRole('heading', { name: 'Your highlights' }).hover()
    await page.waitForTimeout(5500)
    await expect(carousel).toHaveAttribute('data-active-index', '1')
  })

  test('does not auto-advance when the user prefers reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.reload()
    const carousel = page.getByTestId('highlights-carousel')
    await expect(carousel.getByTestId('carousel-slide').first()).toBeVisible()
    await page.mouse.move(0, 0)
    await page.waitForTimeout(5500)
    await expect(carousel).toHaveAttribute('data-active-index', '0')
  })

  test('slides link to the page with the details', async ({ page }) => {
    const first = page.getByTestId('carousel-slide').first()
    await first.getByRole('link').click()
    await expect(page).toHaveURL(/\/(leaderboard|dashboard|habits)$/)
  })
})

test.describe('Background picker', () => {
  test('changes the background and remembers it after a reload', async ({ page }) => {
    await page.getByTestId('account-menu-btn').click()
    const picker = page.getByTestId('bg-picker')
    await expect(picker).toBeVisible()

    await picker.getByTestId('bg-track').click()
    await expect(page.locator('html')).toHaveAttribute('data-bg', 'track')
    await expect(picker.getByTestId('bg-track')).toHaveAttribute('aria-checked', 'true')
    await expect(picker).toBeVisible() // the menu stays open while choosing

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-bg', 'track')

    // Put the default back so other tests see the usual look
    await page.getByTestId('account-menu-btn').click()
    await page.getByTestId('bg-topo').click()
    await expect(page.locator('html')).toHaveAttribute('data-bg', 'topo')
  })
})

test.describe('3D models', () => {
  test('the streak medal on Home loads (or falls back to a flat medal)', async ({ page }) => {
    const medal = page.getByTestId('streak-medal')
    await expect(medal).toHaveAttribute('data-state', /ready|fallback/, { timeout: 15000 })
  })

  test('the trophy on the leaderboard loads (or falls back to an icon)', async ({ page }) => {
    await page.goto('/leaderboard')
    await expect(page.getByTestId('trophy-3d')).toHaveAttribute('data-state', /ready|fallback/, { timeout: 15000 })
  })
})

test('every page has its own title', async ({ page }) => {
  await expect(page).toHaveTitle('Home · HabitBuddy')
  for (const [path, title] of [['/habits', 'Habits'], ['/dashboard', 'Dashboard'], ['/leaderboard', 'Leaderboard']]) {
    await page.goto(path)
    await expect(page).toHaveTitle(`${title} · HabitBuddy`)
  }
})
