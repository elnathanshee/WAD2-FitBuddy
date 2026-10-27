// End-to-end tests for challenges: only accepted friends can be challenged, and
// an invite is pending until the friend accepts or declines it.
// Every challenge a test creates is titled 'E2E ...' and is removed again (the
// creator can delete a pending or declined one). Tests never accept a
// challenge, because an accepted one can't be deleted; accepting is covered by
// the unit tests in server/tests/challenges.test.js.
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

// ---------- Invites: pending / declined / cancelled ----------

const CHALLENGE_TITLE_PREFIX = 'E2E '

async function pickFriend(request) {
  const res = await request.get('/api/friends', { headers: USER_HEADERS })
  expect(res.ok(), await res.text()).toBeTruthy()
  const { friends } = await res.json()
  return friends[0] || null
}

async function listChallenges(request, headers) {
  const res = await request.get('/api/challenges', { headers })
  expect(res.ok(), await res.text()).toBeTruthy()
  return (await res.json()).challenges
}

async function createChallengeVia(request, headers, opponentId, label) {
  const title = `${CHALLENGE_TITLE_PREFIX}${label} ${Date.now()}`
  const res = await request.post('/api/challenges', {
    headers,
    data: { opponentId, title, habitCategory: 'water', targetDays: 3 },
  })
  expect(res.status(), await res.text()).toBe(201)
  return (await res.json()).challenge
}

test.describe('challenge invites', () => {
  // Remove any E2E challenge the demo user created that is still pending or declined
  test.afterEach(async ({ request }) => {
    const res = await request.get('/api/challenges', { headers: USER_HEADERS })
    if (!res.ok()) return
    for (const ch of (await res.json()).challenges) {
      const mine = String(ch.creator_id) === USER_HEADERS['x-user-id']
      if (mine && ch.title.startsWith(CHALLENGE_TITLE_PREFIX) && ['pending', 'declined'].includes(ch.status)) {
        await request.delete(`/api/challenges/${ch.id}`, { headers: USER_HEADERS })
      }
    }
  })

  test('API: create, decline, dismiss and the permission rules', async ({ request }) => {
    const friend = await pickFriend(request)
    test.skip(!friend, 'The demo user has no friends')
    const friendHeaders = { 'x-user-id': friend.userId }

    const created = await createChallengeVia(request, USER_HEADERS, friend.userId, 'invite')
    expect(created.status).toBe('pending')

    // The friend sees the invite
    expect((await listChallenges(request, friendHeaders)).some((c) => c.id === created.id)).toBe(true)

    // The creator can't accept their own challenge, the friend can't delete it
    const selfAccept = await request.post(`/api/challenges/${created.id}/accept`, { headers: USER_HEADERS })
    expect(selfAccept.status(), await selfAccept.text()).toBe(403)
    const friendDelete = await request.delete(`/api/challenges/${created.id}`, { headers: friendHeaders })
    expect(friendDelete.status(), await friendDelete.text()).toBe(403)

    // Nobody can log progress before it is accepted
    const early = await request.post(`/api/challenges/${created.id}/progress`, { headers: USER_HEADERS })
    expect(early.status(), await early.text()).toBe(400)

    // The friend declines: it disappears for them but stays visible, declined, for the creator
    const declined = await request.post(`/api/challenges/${created.id}/decline`, { headers: friendHeaders })
    expect(declined.status(), await declined.text()).toBe(200)
    expect((await declined.json()).challenge.status).toBe('declined')
    expect((await listChallenges(request, friendHeaders)).some((c) => c.id === created.id)).toBe(false)
    const mine = (await listChallenges(request, USER_HEADERS)).find((c) => c.id === created.id)
    expect(mine?.status).toBe('declined')

    // The creator dismisses it
    const removed = await request.delete(`/api/challenges/${created.id}`, { headers: USER_HEADERS })
    expect(removed.status(), await removed.text()).toBe(200)
    expect((await listChallenges(request, USER_HEADERS)).some((c) => c.id === created.id)).toBe(false)
  })

  test('UI: declining an invite from a friend removes it from Home', async ({ page, request }) => {
    const friend = await pickFriend(request)
    test.skip(!friend, 'The demo user has no friends')
    const friendHeaders = { 'x-user-id': friend.userId }

    const invite = await createChallengeVia(request, friendHeaders, USER_HEADERS['x-user-id'], 'decline me')
    try {
      await login(page)
      const row = page.getByTestId('challenge-invite').filter({ hasText: invite.title })
      await expect(row).toBeVisible()
      const count = Number(await page.getByTestId('challenge-invite-count').innerText())
      expect(count).toBeGreaterThanOrEqual(1)

      await row.getByTestId('challenge-decline-btn').click()
      await expect(row).toHaveCount(0)
    } finally {
      // Declined, so the friend (the creator) can dismiss it
      await request.delete(`/api/challenges/${invite.id}`, { headers: friendHeaders })
    }
  })

  test('UI: cancelling a challenge I sent', async ({ page, request }) => {
    const friend = await pickFriend(request)
    test.skip(!friend, 'The demo user has no friends')

    const sent = await createChallengeVia(request, USER_HEADERS, friend.userId, 'cancel me')
    await login(page)
    const row = page.getByTestId('challenge-pending').filter({ hasText: sent.title })
    await expect(row).toBeVisible()
    await expect(row).toContainText('Waiting for')

    await row.getByTestId('challenge-cancel-btn').click()
    await expect(row).toHaveCount(0)
  })
})

// ---------- Friend-request counters (read-only) ----------

test('the friend-request count shows in the navbar and on the Friends page', async ({ page, request }) => {
  const res = await request.get('/api/friends', { headers: USER_HEADERS })
  expect(res.ok(), await res.text()).toBeTruthy()
  const { incoming } = await res.json()

  await login(page)
  await page.getByTestId('tab-friends').click()
  await expect(page).toHaveURL(/\/friends/)
  await expect(page.getByRole('heading', { name: 'Friends', exact: true }).first()).toBeVisible()

  if (incoming.length > 0) {
    await expect(page.getByTestId('friends-request-badge')).toContainText(String(incoming.length))
    await expect(page.getByTestId('friend-requests-count')).toContainText(String(incoming.length))
  } else {
    await expect(page.getByTestId('friends-request-badge')).toHaveCount(0)
    await expect(page.getByTestId('friend-requests-count')).toHaveCount(0)
  }
})
