// End-to-end tests for leaderboard cheers and nudges: each type can be sent
// to a person once per day. Cheers can't be deleted, so the tests target a
// seeded athlete and accept that an earlier run today may have already sent
// one — they then check the locked state instead of sending again.
import { test, expect } from '@playwright/test'
import { login, USER_HEADERS } from './helpers.js'

const rowFor = (page, userId) => page.locator(`[data-testid="leaderboard-row"][data-user-id="${userId}"]`)

// Only the seeded rival athletes (server/seedNeon.js), never throwaway test users
async function weeklyEntries(request) {
  const res = await request.get('/api/leaderboard/weekly', { headers: USER_HEADERS })
  expect(res.ok(), await res.text()).toBeTruthy()
  return (await res.json()).entries.filter((e) => e.isCurrentUser || e.userId.startsWith('rival_'))
}

test.beforeEach(async ({ page }) => {
  await login(page)
})

test('the board lists athletes with cheer and nudge buttons for others only', async ({ page }) => {
  await page.goto('/leaderboard')
  const rows = page.getByTestId('leaderboard-row')
  await expect(rows.first()).toBeVisible()

  const me = rows.filter({ has: page.locator('.badge', { hasText: 'You' }) })
  await expect(me.getByTestId('cheer-btn')).toHaveCount(0)
  await expect(page.getByTestId('cheer-btn').first()).toBeVisible()
})

test('a cheer can be sent once per day, and stays locked after a reload', async ({ page, request }) => {
  const entries = await weeklyEntries(request)
  const target = entries.find((e) => !e.isCurrentUser && !e.sentToday.cheer) ?? entries.find((e) => !e.isCurrentUser)

  await page.goto('/leaderboard')
  const row = rowFor(page, target.userId)
  const cheer = row.getByTestId('cheer-btn')

  if (!target.sentToday.cheer) {
    // Act: send the day's cheer
    await expect(cheer).toBeEnabled()
    await cheer.click()
    await expect(page.getByTestId('leaderboard-toast')).toContainText('cheered')
  }

  // Assert: locked now and after a reload
  await expect(cheer).toBeDisabled()
  await expect(cheer).toHaveText(/Cheered/)
  await page.reload()
  await expect(rowFor(page, target.userId).getByTestId('cheer-btn')).toBeDisabled()
})

test('the server rejects a second cheer of the same type on the same day', async ({ request }) => {
  const entries = await weeklyEntries(request)
  const target = entries.find((e) => !e.isCurrentUser)
  const send = () =>
    request.post('/api/leaderboard/cheer', {
      headers: USER_HEADERS,
      data: { recipientId: target.userId, type: 'cheer' },
    })

  const first = await send()
  expect([200, 409]).toContain(first.status()) // 409 if already sent earlier today
  const second = await send()
  expect(second.status()).toBe(409)
  expect((await second.json()).message).toMatch(/already sent a cheer/i)
})

test('cheer and nudge are limited separately', async ({ request }) => {
  const entries = await weeklyEntries(request)
  const target = entries.find((e) => !e.isCurrentUser && !e.sentToday.nudge)
  test.skip(!target, 'Every athlete has already been nudged today')

  // Even if today's cheer was already sent to this athlete, the nudge still goes through
  const res = await request.post('/api/leaderboard/cheer', {
    headers: USER_HEADERS,
    data: { recipientId: target.userId, type: 'nudge' },
  })
  expect(res.status()).toBe(200)

  const after = (await weeklyEntries(request)).find((e) => e.userId === target.userId)
  expect(after.sentToday.nudge).toBe(true)
})

// Read-only: no cheers, nudges or friend requests are sent here
test.describe('leaderboard tabs (Global / Friends)', () => {
  test('opens on Global and lists everyone', async ({ page, request }) => {
    const res = await request.get('/api/leaderboard/weekly', { headers: USER_HEADERS })
    const { entries } = await res.json()

    await page.goto('/leaderboard')
    await expect(page.getByTestId('lb-tab-global')).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByTestId('leaderboard-row')).toHaveCount(entries.length)
  })

  test('Friends tab shows only you and your friends, ranked among themselves', async ({ page, request }) => {
    const res = await request.get('/api/friends', { headers: USER_HEADERS })
    const { friends } = await res.json()
    const allowed = ['1', ...friends.map((f) => f.userId)]

    await page.goto('/leaderboard')
    await page.getByTestId('lb-tab-friends').click()
    await expect(page.getByTestId('lb-tab-friends')).toHaveAttribute('aria-selected', 'true')

    const rows = page.getByTestId('leaderboard-row')
    await expect(rows).toHaveCount(1 + friends.length)
    for (const id of await rows.evaluateAll((els) => els.map((el) => el.dataset.userId))) {
      expect(allowed).toContain(id)
    }
    await expect(rows.first().locator('.lb-rank')).toHaveText('1')
  })
})
