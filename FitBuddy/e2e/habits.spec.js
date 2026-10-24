// End-to-end tests for the Habit feature: CRUD, daily check-ins,
// completion history and streaks.
//
// These tests are the acceptance criteria for the feature. They use the
// data-testid "selector contract" in e2e/README.md — the Vue components must
// put those attributes on the matching elements.
//
// Structure of every test: Arrange (often via API, for speed) → Act (via UI) →
// Assert (via UI, and after a reload to prove the data was really saved).
import { test, expect } from '@playwright/test'
import {
  login,
  weekStartKey,
  uniqueHabitName,
  dateKey,
  createHabitViaApi,
  checkInViaApi,
  deleteTestHabits,
} from './helpers.js'

const habitCard = (page, name) => page.getByTestId('habit-card').filter({ hasText: name })

// Opens the Log popup for a habit, enters an amount and submits it.
async function logViaUi(page, name, amount) {
  await habitCard(page, name).getByTestId('log-btn').click()
  const modal = page.getByTestId('log-modal')
  await modal.getByTestId('log-amount-input').fill(String(amount))
  await modal.getByTestId('log-submit-btn').click()
  await expect(modal).toHaveCount(0) // popup closes after saving
}

test.beforeEach(async ({ page }) => {
  await login(page)
})

test.afterEach(async ({ request }) => {
  await deleteTestHabits(request)
})

test.describe('Create', () => {
  test('creates a habit with all fields and it persists after reload', async ({ page }) => {
    const name = uniqueHabitName('Drink water')
    await page.goto('/habits')

    await page.getByTestId('add-habit-btn').click()
    const form = page.getByTestId('habit-form')
    await form.getByTestId('habit-name-input').fill(name)
    await form.getByTestId('habit-category-select').selectOption('water')
    await form.getByTestId('habit-frequency-select').selectOption('daily')
    await form.getByTestId('habit-target-amount-input').fill('8')
    await form.getByTestId('habit-target-unit-select').selectOption('glasses')
    await form.getByTestId('habit-save-btn').click()

    await expect(habitCard(page, name)).toBeVisible()
    await expect(habitCard(page, name).getByTestId('habit-progress')).toHaveText(/0\s*\/\s*8/)

    await page.reload()
    await expect(habitCard(page, name)).toBeVisible()
  })

  test('weekly habits have a weekly target instead of a daily one', async ({ page }) => {
    const name = uniqueHabitName('Gym')
    await page.goto('/habits')

    await page.getByTestId('add-habit-btn').click()
    const form = page.getByTestId('habit-form')
    await expect(form.getByTestId('habit-target-label')).toHaveText('Daily target')
    await form.getByTestId('habit-name-input').fill(name)
    await form.getByTestId('habit-frequency-select').selectOption('weekly')
    await expect(form.getByTestId('habit-target-label')).toHaveText('Weekly target')
    await expect(form.getByTestId('habit-times-per-week-input')).toHaveCount(0) // no "days per week" any more
    await form.getByTestId('habit-target-amount-input').fill('150')
    await form.getByTestId('habit-target-unit-select').selectOption('minutes')
    await form.getByTestId('habit-save-btn').click()

    const card = habitCard(page, name)
    await expect(card.getByTestId('habit-frequency')).toHaveText('Weekly')
    await expect(card).toContainText('This week')
    await expect(card.getByTestId('habit-progress')).toHaveText(/0\s*\/\s*150/)
    await expect(card).toContainText('week streak')
  })

  test('saves a custom category, custom unit, decimal target and chosen emoji', async ({ page }) => {
    const name = uniqueHabitName('Meditate')
    await page.goto('/habits')

    await page.getByTestId('add-habit-btn').click()
    const form = page.getByTestId('habit-form')
    await form.getByTestId('habit-name-input').fill(name)
    await form.getByTestId('habit-category-select').selectOption('other')
    await form.getByTestId('habit-custom-category-input').fill('Mindfulness')
    await form.getByTestId('habit-target-amount-input').fill('2.5')
    await form.getByTestId('habit-target-unit-select').selectOption({ label: 'Other…' })
    await form.getByTestId('habit-custom-unit-input').fill('breaths')
    // Pick an emoji through the picker's search box
    await form.getByTestId('habit-emoji-btn').click()
    const picker = form.locator('emoji-picker')
    await picker.getByRole('combobox').fill('rocket')
    await picker.getByRole('option', { name: /rocket/i }).first().click()
    await expect(form.getByTestId('habit-emoji-value')).toHaveText('🚀')
    await form.getByTestId('habit-save-btn').click()

    const card = habitCard(page, name)
    await expect(card).toContainText('🚀')
    await expect(card).toContainText('Mindfulness')
    await expect(card.getByTestId('habit-progress')).toHaveText(/0\s*\/\s*2\.5/)
    await expect(card).toContainText('breaths')

    // Editing shows the custom values again
    await card.getByTestId('habit-edit-btn').click()
    await expect(form.getByTestId('habit-custom-category-input')).toHaveValue('Mindfulness')
    await expect(form.getByTestId('habit-custom-unit-input')).toHaveValue('breaths')
  })

  test('shows an error and does not save when the name is empty', async ({ page }) => {
    await page.goto('/habits')
    await page.waitForLoadState('networkidle') // let the list load before counting
    const before = await page.getByTestId('habit-card').count()

    await page.getByTestId('add-habit-btn').click()
    await page.getByTestId('habit-save-btn').click()

    await expect(page.getByTestId('habit-form-error')).toBeVisible()
    await page.reload()
    await expect(page.getByTestId('habit-card')).toHaveCount(before)
  })
})

test.describe('Read', () => {
  test('lists the user\'s habits', async ({ page, request }) => {
    const a = await createHabitViaApi(request, { name: uniqueHabitName('Read A') })
    const b = await createHabitViaApi(request, { name: uniqueHabitName('Read B') })

    await page.goto('/habits')

    await expect(habitCard(page, a.name)).toBeVisible()
    await expect(habitCard(page, b.name)).toBeVisible()
  })
})

test.describe('Update', () => {
  test('edits a habit\'s name and target', async ({ page, request }) => {
    const habit = await createHabitViaApi(request, { name: uniqueHabitName('Before edit') })
    const newName = uniqueHabitName('After edit')
    await page.goto('/habits')

    await habitCard(page, habit.name).getByTestId('habit-edit-btn').click()
    const form = page.getByTestId('habit-form')
    await expect(form.getByTestId('habit-name-input')).toHaveValue(habit.name) // form is pre-filled
    await form.getByTestId('habit-name-input').fill(newName)
    await form.getByTestId('habit-target-amount-input').fill('5')
    await form.getByTestId('habit-save-btn').click()

    await expect(habitCard(page, newName)).toBeVisible()
    await expect(habitCard(page, habit.name)).toHaveCount(0)

    await page.reload()
    await expect(habitCard(page, newName).getByTestId('habit-progress')).toHaveText(/0\s*\/\s*5/)
  })
})

test.describe('Delete', () => {
  test('deletes a habit only after confirming', async ({ page, request }) => {
    const habit = await createHabitViaApi(request, { name: uniqueHabitName('To delete') })
    await page.goto('/habits')

    await habitCard(page, habit.name).getByTestId('habit-delete-btn').click()
    await expect(page.getByTestId('confirm-delete-btn')).toBeVisible()
    await page.getByTestId('confirm-delete-btn').click()

    await expect(habitCard(page, habit.name)).toHaveCount(0)
    await page.reload()
    await expect(habitCard(page, habit.name)).toHaveCount(0)
  })
})

test.describe('Logging progress', () => {
  test('logging the target amount completes a habit and starts a streak', async ({ page, request }) => {
    const habit = await createHabitViaApi(request, { name: uniqueHabitName('Run') })
    await page.goto('/habits')
    const card = habitCard(page, habit.name)
    await expect(card.getByTestId('habit-streak')).toHaveText('0')

    await logViaUi(page, habit.name, 1)

    await expect(card.getByTestId('habit-progress')).toHaveText(/1\s*\/\s*1/)
    await expect(card.getByTestId('habit-streak')).toHaveText('1')
    await page.reload()
    await expect(card.getByTestId('habit-streak')).toHaveText('1')
  })

  test('custom decimal amounts add up; partial progress is not complete', async ({ page, request }) => {
    const habit = await createHabitViaApi(request, {
      name: uniqueHabitName('Jog'),
      target: { amount: 3, unit: 'km' },
    })
    await page.goto('/habits')
    const card = habitCard(page, habit.name)

    await logViaUi(page, habit.name, 1.5)
    await expect(card.getByTestId('habit-progress')).toHaveText(/1\.5\s*\/\s*3/)
    await expect(card.getByTestId('habit-streak')).toHaveText('0')

    await logViaUi(page, habit.name, 1.5)
    await expect(card.getByTestId('habit-progress')).toHaveText(/3\s*\/\s*3/)
    await expect(card.getByTestId('habit-streak')).toHaveText('1')
  })

  test('a quick chip fills in the amount', async ({ page, request }) => {
    const habit = await createHabitViaApi(request, {
      name: uniqueHabitName('Water'),
      target: { amount: 8, unit: 'glasses' },
    })
    await page.goto('/habits')

    await habitCard(page, habit.name).getByTestId('log-btn').click()
    const modal = page.getByTestId('log-modal')
    await modal.getByTestId('log-chip').filter({ hasText: '+2' }).click()
    await expect(modal.getByTestId('log-amount-input')).toHaveValue('2')
    await modal.getByTestId('log-submit-btn').click()

    await expect(habitCard(page, habit.name).getByTestId('habit-progress')).toHaveText(/2\s*\/\s*8/)
  })

  test("'Edit today's total' fixes a mistake", async ({ page, request }) => {
    const habit = await createHabitViaApi(request, {
      name: uniqueHabitName('Typo'),
      target: { amount: 10, unit: 'minutes' },
    })
    await checkInViaApi(request, habit._id, dateKey(0), 50) // oops: meant 5
    await page.goto('/habits')
    const card = habitCard(page, habit.name)
    await expect(card.getByTestId('habit-streak')).toHaveText('1')

    await card.getByTestId('log-btn').click()
    const modal = page.getByTestId('log-modal')
    await modal.getByTestId('edit-total-link').click()
    await expect(modal.getByTestId('edit-total-input')).toHaveValue('50')
    await modal.getByTestId('edit-total-input').fill('5')
    await modal.getByTestId('edit-total-save-btn').click()

    await expect(card.getByTestId('habit-progress')).toHaveText(/5\s*\/\s*10/)
    await expect(card.getByTestId('habit-streak')).toHaveText('0')
  })

  test('a mis-tapped log can be undone from the confirmation bar', async ({ page, request }) => {
    const habit = await createHabitViaApi(request, { name: uniqueHabitName('Undo'), target: { amount: 5, unit: 'times' } })
    await page.goto('/habits')
    const card = habitCard(page, habit.name)
    await logViaUi(page, habit.name, 3)
    await expect(card.getByTestId('habit-progress')).toHaveText(/3\s*\/\s*5/)

    const bar = page.getByTestId('undo-bar')
    await expect(bar).toContainText('Logged 3 times')
    await bar.getByTestId('undo-log-btn').click()
    await expect(bar).toHaveCount(0)
    await expect(card.getByTestId('habit-progress')).toHaveText(/0\s*\/\s*5/)

    // Saved for real
    await page.reload()
    await expect(habitCard(page, habit.name).getByTestId('habit-progress')).toHaveText(/0\s*\/\s*5/)
  })

  test('there is no one-click reset/undo button on the card', async ({ page, request }) => {
    const habit = await createHabitViaApi(request, { name: uniqueHabitName('No undo') })
    await page.goto('/habits')
    await expect(habitCard(page, habit.name)).toBeVisible()
    await expect(page.getByTestId('undo-checkin-btn')).toHaveCount(0)
  })
})

test.describe('Status colours', () => {
  // The card's top border uses the status colour
  const borderColour = (card) => card.evaluate((el) => getComputedStyle(el).borderTopColor)

  test('cards are grey, then amber, then green — the same for every habit', async ({ page, request }) => {
    const a = await createHabitViaApi(request, { name: uniqueHabitName('Status A'), target: { amount: 4, unit: 'times' } })
    const b = await createHabitViaApi(request, { name: uniqueHabitName('Status B'), target: { amount: 2, unit: 'km' } })
    await page.goto('/habits')
    const cardA = habitCard(page, a.name)
    const cardB = habitCard(page, b.name)

    await expect(cardA).toHaveAttribute('data-status', 'not-started')
    await expect(cardA.getByTestId('habit-status')).toHaveText('Not started')
    expect(await borderColour(cardA)).toBe('rgb(108, 117, 125)') // grey
    expect(await borderColour(cardB)).toBe(await borderColour(cardA)) // same status → same colour

    await logViaUi(page, a.name, 1)
    await expect(cardA).toHaveAttribute('data-status', 'in-progress')
    expect(await borderColour(cardA)).toBe('rgb(245, 159, 0)') // amber

    await logViaUi(page, a.name, 3)
    await expect(cardA).toHaveAttribute('data-status', 'completed')
    expect(await borderColour(cardA)).toBe('rgb(25, 135, 84)') // green
  })
})

test.describe('Weekly habits', () => {
  test("progress is the whole week's total (Monday–Sunday)", async ({ page, request }) => {
    const habit = await createHabitViaApi(request, {
      name: uniqueHabitName('Weekly study'),
      frequency: 'weekly',
      target: { amount: 10, unit: 'hours' },
    })
    const today = dateKey(0)
    const monday = weekStartKey(today)
    await checkInViaApi(request, habit._id, today, 3)
    if (monday !== today) await checkInViaApi(request, habit._id, monday, 4)
    const expected = monday !== today ? 7 : 3

    await page.goto('/habits')
    const card = habitCard(page, habit.name)
    await expect(card.getByTestId('habit-progress')).toHaveText(new RegExp(`^${expected}\\s*/\\s*10$`))
    await expect(card).toHaveAttribute('data-status', 'in-progress')

    // Reaching the weekly total completes it for the rest of the week
    await logViaUi(page, habit.name, 10 - expected)
    await expect(card).toHaveAttribute('data-status', 'completed')
    await expect(card.getByTestId('habit-streak')).toHaveText('1')

    // The history panel shows the week as hit
    await card.getByTestId('habit-history-btn').click()
    await expect(page.locator(`[data-testid="history-week"][data-week="${monday}"]`))
      .toHaveAttribute('data-completed', 'true')
  })
})

test.describe('Daily reset', () => {
  test("an open page resets today's progress after midnight", async ({ page, request }) => {
    const habit = await createHabitViaApi(request, { name: uniqueHabitName('Midnight') })
    await checkInViaApi(request, habit._id, dateKey(0))

    // Pretend it's 11:58pm today, then let the clock run past midnight.
    const now = new Date()
    await page.clock.install({ time: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 58) })
    await page.goto('/habits')
    const card = habitCard(page, habit.name)
    await expect(card.getByTestId('habit-progress')).toHaveText(/1\s*\/\s*1/)

    await page.clock.runFor('03:00') // 3 minutes later: 00:01 tomorrow

    await expect(card.getByTestId('habit-progress')).toHaveText(/0\s*\/\s*1/)
    // Yesterday still counts, so the streak isn't lost (grace rule)
    await expect(card.getByTestId('habit-streak')).toHaveText('1')
  })
})

test.describe('Celebration', () => {
  test('finishing the last habit of the day shows the celebration', async ({ page, request }) => {
    // A brand-new user, so the demo user's other habits don't count
    const userId = `e2e-${Date.now()}`
    const headers = { 'x-user-id': userId }
    await page.evaluate((id) => {
      const user = JSON.parse(localStorage.getItem('fitbuddy_user'))
      localStorage.setItem('fitbuddy_user', JSON.stringify({ ...user, id }))
      // A token the server can't verify, so it falls back to the x-user-id
      // header (the new user) while the router still treats us as logged in
      localStorage.setItem('fitbuddy_token', 'e2e-unverified')
    }, userId)

    try {
      const done = await createHabitViaApi(request, { name: uniqueHabitName('Done') }, headers)
      const last = await createHabitViaApi(request, { name: uniqueHabitName('Last') }, headers)
      await checkInViaApi(request, done._id, dateKey(0), 1, headers)
      await page.goto('/habits')
      await expect(page.getByTestId('celebration-banner')).toHaveCount(0) // not on page load

      await logViaUi(page, last.name, 1)

      await expect(page.getByTestId('celebration-banner')).toBeVisible()
      await expect(page.locator('canvas')).toHaveCount(1) // the confetti canvas
    } finally {
      await deleteTestHabits(request, headers)
    }
  })
})

test.describe('Completion history & streaks', () => {
  test('shows past completions and the current streak', async ({ page, request }) => {
    const habit = await createHabitViaApi(request, { name: uniqueHabitName('History') })
    // Completed 3 days in a row ending yesterday; today not done yet.
    for (const offset of [-3, -2, -1]) {
      await checkInViaApi(request, habit._id, dateKey(offset))
    }
    await page.goto('/habits')
    const card = habitCard(page, habit.name)

    // Grace rule: streak still counts because yesterday was completed
    await expect(card.getByTestId('habit-streak')).toHaveText('3')

    await card.getByTestId('habit-history-btn').click()
    const history = page.getByTestId('habit-history')
    await expect(history).toBeVisible()
    await expect(history.locator(`[data-testid="history-day"][data-date="${dateKey(-1)}"]`))
      .toHaveAttribute('data-completed', 'true')
    await expect(history.locator(`[data-testid="history-day"][data-date="${dateKey(-4)}"]`))
      .toHaveAttribute('data-completed', 'false')
    await expect(history.getByTestId('history-current-streak')).toHaveText('3')
  })

  test('longest streak is kept after the current streak breaks', async ({ page, request }) => {
    const habit = await createHabitViaApi(request, { name: uniqueHabitName('Longest') })
    // A 4-day run ending 10 days ago, then only today.
    for (const offset of [-13, -12, -11, -10, 0]) {
      await checkInViaApi(request, habit._id, dateKey(offset))
    }
    await page.goto('/habits')

    await habitCard(page, habit.name).getByTestId('habit-history-btn').click()
    const history = page.getByTestId('habit-history')
    await expect(history.getByTestId('history-current-streak')).toHaveText('1')
    await expect(history.getByTestId('history-longest-streak')).toHaveText('4')
  })
})

test.describe('Access control', () => {
  test('API rejects requests with no user', async ({ request }) => {
    const res = await request.get('/api/habits')
    expect(res.status()).toBe(401)
  })

  test('a user cannot see or delete another user\'s habit', async ({ request }) => {
    const habit = await createHabitViaApi(request, { name: uniqueHabitName('Private') })
    const otherUser = { 'x-user-id': 'someone-else' }

    expect((await request.get(`/api/habits/${habit._id}`, { headers: otherUser })).status()).toBe(404)
    expect((await request.delete(`/api/habits/${habit._id}`, { headers: otherUser })).status()).toBe(404)
  })
})
