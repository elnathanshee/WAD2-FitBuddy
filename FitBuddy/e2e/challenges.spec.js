// End-to-end tests for challenges: only accepted friends can be challenged.
// Read-only: the API test is rejected (no row is created) and the UI test
// closes the modal without sending.
import { test, expect } from '@playwright/test'
import { login, USER_HEADERS } from './helpers.js'

test('the server rejects a challenge against someone who is not a friend (403)', async ({ request }) => {
  const weekly = await request.get('/api/leaderboard/weekly', { headers: USER_HEADERS })
  expect(weekly.ok(), await weekly.text()).toBeTruthy()
  const { entries } = await weekly.json()
  const stranger = entries.find((e) => !e.isCurrentUser && e.friendStatus !== 'friends')
  test.skip(!stranger, 'Every athlete is already a friend of the demo user')

  const res = await request.post('/api/challenges', {
    headers: USER_HEADERS,
    data: { opponentId: stranger.userId, title: 'E2E should be rejected', habitCategory: 'water', targetDays: 3 },
  })
  expect(res.status(), await res.text()).toBe(403)
})

test('the New challenge dropdown lists only friends', async ({ page, request }) => {
  const res = await request.get('/api/friends', { headers: USER_HEADERS })
  expect(res.ok(), await res.text()).toBeTruthy()
  const { friends } = await res.json()

  await login(page)
  await page.getByTestId('home-challenges').getByRole('button', { name: 'Start a challenge' }).click()

  if (friends.length === 0) {
    await expect(page.getByTestId('challenge-no-friends')).toBeVisible()
  } else {
    const select = page.getByTestId('challenge-opponent-select')
    await expect(select).toBeVisible()
    const names = (await select.locator('option:not([disabled])').allTextContents()).map((t) => t.trim()).sort()
    expect(names).toEqual(friends.map((f) => f.displayName).sort())
  }
  await page.getByRole('button', { name: 'Cancel' }).click()
})
