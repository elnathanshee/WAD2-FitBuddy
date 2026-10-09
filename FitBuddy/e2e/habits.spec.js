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
  uniqueHabitName,
  dateKey,
  createHabitViaApi,
  checkInViaApi,
  deleteTestHabits,
} from './helpers.js'

const habitCard = (page, name) => page.getByTestId('habit-card').filter({ hasText: name })

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
    await form.getByTestId('habit-target-unit-input').fill('glasses')
    await form.getByTestId('habit-save-btn').click()

    await expect(habitCard(page, name)).toBeVisible()
    await expect(habitCard(page, name).getByTestId('habit-progress')).toHaveText(/0\s*\/\s*8/)

    await page.reload()
    await expect(habitCard(page, name)).toBeVisible()
  })

  test('creates a weekly habit with times per week', async ({ page }) => {
    const name = uniqueHabitName('Gym')
    await page.goto('/habits')

    await page.getByTestId('add-habit-btn').click()
    const form = page.getByTestId('habit-form')
    await form.getByTestId('habit-name-input').fill(name)
    await form.getByTestId('habit-frequency-select').selectOption('weekly')
    await form.getByTestId('habit-times-per-week-input').fill('3')
    await form.getByTestId('habit-save-btn').click()

    await expect(habitCard(page, name).getByTestId('habit-frequency')).toHaveText(/3.*week/i)
  })

  test('shows an error and does not save when the name is empty', async ({ page }) => {
    await page.goto('/habits')
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

test.describe('Daily check-ins', () => {
  test('checking in completes a 1-target habit and starts a streak', async ({ page, request }) => {
    const habit = await createHabitViaApi(request, { name: uniqueHabitName('Run') })
    await page.goto('/habits')
    const card = habitCard(page, habit.name)
    await expect(card.getByTestId('habit-streak')).toHaveText('0')

    await card.getByTestId('checkin-btn').click()

    await expect(card.getByTestId('habit-progress')).toHaveText(/1\s*\/\s*1/)
    await expect(card.getByTestId('habit-streak')).toHaveText('1')
    await page.reload()
    await expect(card.getByTestId('habit-streak')).toHaveText('1')
  })

  test('partial progress does not count as complete until the target is reached', async ({ page, request }) => {
    const habit = await createHabitViaApi(request, {
      name: uniqueHabitName('Water'),
      target: { amount: 3, unit: 'glasses' },
    })
    await page.goto('/habits')
    const card = habitCard(page, habit.name)

    await card.getByTestId('checkin-btn').click()
    await expect(card.getByTestId('habit-progress')).toHaveText(/1\s*\/\s*3/)
    await expect(card.getByTestId('habit-streak')).toHaveText('0')

    await card.getByTestId('checkin-btn').click()
    await card.getByTestId('checkin-btn').click()
    await expect(card.getByTestId('habit-progress')).toHaveText(/3\s*\/\s*3/)
    await expect(card.getByTestId('habit-streak')).toHaveText('1')
  })

  test('undoing a check-in removes today\'s progress', async ({ page, request }) => {
    const habit = await createHabitViaApi(request, { name: uniqueHabitName('Undo') })
    await checkInViaApi(request, habit._id, dateKey(0))
    await page.goto('/habits')
    const card = habitCard(page, habit.name)
    await expect(card.getByTestId('habit-streak')).toHaveText('1')

    await card.getByTestId('undo-checkin-btn').click()

    await expect(card.getByTestId('habit-progress')).toHaveText(/0\s*\/\s*1/)
    await expect(card.getByTestId('habit-streak')).toHaveText('0')
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
