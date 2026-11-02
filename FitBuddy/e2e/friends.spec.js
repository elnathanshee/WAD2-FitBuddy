// End-to-end tests for the Friends feature: searching, friend requests,
// accepting / declining / removing, a friend's profile, the server's rules, and
// the friend links on the leaderboard. Only rival_david is ever changed (the
// seed leaves him unconnected); Alex and Bernice are friends and Charlie has a
// pending request, and the tests only read those.
import { test, expect } from '@playwright/test'
import { login, USER_HEADERS, DAVID, DAVID_HEADERS, resetFriendship, createHabitViaApi, checkInViaApi, deleteTestHabits, dateKey } from './helpers.js'

const ALEX_HEADERS = { 'x-user-id': 'rival_alex' }

const resultRow = (page, userId) => page.getByTestId('friends-results').locator(`[data-user-id="${userId}"]`)
const friendRow = (page, userId) => page.getByTestId('friends-list').locator(`[data-user-id="${userId}"]`)

async function searchFor(page, text) {
  await page.getByTestId('friends-search-input').fill(text)
  await page.getByTestId('friends-search-btn').click()
}

// David asks the demo user to be friends
async function davidSendsRequest(request) {
  const res = await request.post('/api/friends/requests', { headers: DAVID_HEADERS, data: { userId: '1' } })
  expect(res.status(), await res.text()).toBe(201)
}

test.beforeEach(async ({ page, request }) => {
  await resetFriendship(request)
  await login(page)
})

test.afterEach(async ({ request }) => {
  await deleteTestHabits(request, ALEX_HEADERS)
  await resetFriendship(request)
})

test('search, send a request, and cancel it', async ({ page }) => {
  await page.goto('/friends')
  await searchFor(page, 'David')
  const row = resultRow(page, DAVID)
  await expect(row).toContainText('David Lee')

  // Act: send the request
  await row.getByTestId('friend-add-btn').click()
  await expect(page.getByTestId('friends-toast')).toContainText('Friend request sent')
  await expect(row.getByTestId('friend-requested-btn')).toBeDisabled()

  // It is still there after a reload
  await page.reload()
  await searchFor(page, 'David')
  await expect(resultRow(page, DAVID).getByTestId('friend-requested-btn')).toBeVisible()

  // Cancel it: back to "Add friend"
  await resultRow(page, DAVID).getByTestId('friend-cancel-btn').click()
  await expect(resultRow(page, DAVID).getByTestId('friend-add-btn')).toBeVisible()
})

test('accept a request, then remove the friend', async ({ page, request }) => {
  await davidSendsRequest(request)

  await page.goto('/friends')
  const incoming = page.getByTestId('requests-incoming').locator(`[data-user-id="${DAVID}"]`)
  await expect(incoming).toContainText('David Lee')
  await incoming.getByTestId('friend-accept-btn').click()
  await expect(page.getByTestId('friends-toast')).toContainText('now friends')

  // David moves from the requests to "Your friends"
  await expect(friendRow(page, DAVID)).toBeVisible()
  await expect(incoming).toHaveCount(0)

  // Remove him, after confirming
  await friendRow(page, DAVID).getByTestId('friend-remove-btn').click()
  await expect(page.getByTestId('remove-friend-modal')).toBeVisible()
  await page.getByTestId('confirm-remove-friend-btn').click()
  await expect(friendRow(page, DAVID)).toHaveCount(0)
})

test('decline a request', async ({ page, request }) => {
  await davidSendsRequest(request)

  await page.goto('/friends')
  const incoming = page.getByTestId('requests-incoming').locator(`[data-user-id="${DAVID}"]`)
  await incoming.getByTestId('friend-decline-btn').click()
  await expect(page.getByTestId('friends-toast')).toContainText('declined')
  await expect(incoming).toHaveCount(0)

  // He can be added again
  await searchFor(page, 'David')
  await expect(resultRow(page, DAVID).getByTestId('friend-add-btn')).toBeVisible()
})

test("a friend's profile shows their week and habits, with Friends highlighted", async ({ page, request }) => {
  // Arrange: Alex may have no habits in the shared database, so give him one (removed afterwards)
  const habit = await createHabitViaApi(request, {}, ALEX_HEADERS)
  await checkInViaApi(request, habit._id, dateKey(), 1, ALEX_HEADERS)

  await page.goto('/friends')
  await friendRow(page, 'rival_alex').getByRole('link', { name: 'Alex Tan' }).click()

  await expect(page).toHaveURL(/\/friends\/rival_alex$/)
  await expect(page.getByRole('heading', { name: 'Alex Tan', level: 1 })).toBeVisible()
  await expect(page.getByTestId('friend-stat')).toHaveCount(4)
  await expect(page.getByTestId('friend-week-strip').getByTestId('friend-week-dot')).toHaveCount(7)
  // Alex may also have real habits, so find ours by name instead of assuming it is first
  await expect(page.getByTestId('friend-habit').filter({ hasText: 'E2E' }).first()).toBeVisible()
  await expect(page.getByTestId('tab-friends')).toHaveClass(/router-link-active/)
})

test('the server enforces the friend rules and never returns emails', async ({ request }) => {
  // Profiles are for friends only
  const profile = await request.get(`/api/friends/${DAVID}/profile`, { headers: USER_HEADERS })
  expect(profile.status()).toBe(403)

  // Can't add yourself
  const self = await request.post('/api/friends/requests', { headers: USER_HEADERS, data: { userId: '1' } })
  expect(self.status()).toBe(400)

  // A second request to the same person is refused
  const first = await request.post('/api/friends/requests', { headers: USER_HEADERS, data: { userId: DAVID } })
  expect(first.status()).toBe(201)
  const second = await request.post('/api/friends/requests', { headers: USER_HEADERS, data: { userId: DAVID } })
  expect(second.status()).toBe(409)

  // Searches need 2+ characters
  const short = await request.get('/api/friends/search', { headers: USER_HEADERS, params: { q: 'a' } })
  expect(short.status()).toBe(400)

  // Results carry no email, even when found by email
  for (const q of ['alex', 'alex@fitbuddy.com']) {
    const res = await request.get('/api/friends/search', { headers: USER_HEADERS, params: { q } })
    expect(res.status()).toBe(200)
    const { results } = await res.json()
    expect(results.length).toBeGreaterThan(0)
    for (const user of results) expect(user).not.toHaveProperty('email')
  }
})

test('the leaderboard links friends to their profile and offers Add friend for others', async ({ page }) => {
  await page.goto('/leaderboard')
  const alex = page.locator('[data-testid="leaderboard-row"][data-user-id="rival_alex"]')
  await alex.getByTestId('leaderboard-friend-link').click()
  await expect(page).toHaveURL(/\/friends\/rival_alex$/)

  await page.goto('/leaderboard')
  const david = page.locator(`[data-testid="leaderboard-row"][data-user-id="${DAVID}"]`)
  await expect(david.getByTestId('add-friend-btn')).toHaveAttribute('aria-label', 'Add friend')
  await expect(david.getByTestId('leaderboard-friend-link')).toHaveCount(0)
})
