// End-to-end tests for the AI Goal Coach chatbot on the Habits page.
// The Gemini-backed endpoint is mocked with page.route, so these tests are
// fast, repeatable and don't spend API quota. The backend endpoint itself is
// covered by server/tests/ai.api.test.js.
import { test, expect } from '@playwright/test'
import { login, uniqueHabitName, deleteTestHabits } from './helpers.js'

const SUGGESTED = uniqueHabitName('Coach walk')

// A coach reply that suggests one habit
function mockCoach(page, { reply = 'Great goal! Start with a short daily walk.', suggestions } = {}) {
  const requests = []
  page.route('**/api/ai/coach-chat', async (route) => {
    requests.push(route.request().postDataJSON())
    await route.fulfill({
      json: {
        reply,
        suggestions: suggestions ?? [
          {
            name: SUGGESTED,
            category: 'exercise',
            frequency: 'daily',
            target: { amount: 20, unit: 'minutes' },
            icon: '🚶',
            description: 'Builds the base fitness you need for a 5K.',
          },
        ],
      },
    })
  })
  return requests
}

test.beforeEach(async ({ page }) => {
  await login(page)
  await page.goto('/habits')
})

test.afterEach(async ({ request }) => {
  await deleteTestHabits(request)
})

test('the coach is a round button in the bottom-right corner that says "Ask me anything!"', async ({ page }) => {
  const fab = page.getByTestId('ai-coach-btn')
  await expect(fab).toBeVisible()
  await expect(page.getByTestId('coach-hint')).toHaveText('Ask me anything!')
  expect(await fab.evaluate((el) => getComputedStyle(el).borderRadius)).toBe('50%')
  const box = await fab.boundingBox()
  const viewport = page.viewportSize()
  expect(box.x + box.width).toBeGreaterThan(viewport.width - 40)
  expect(box.y + box.height).toBeGreaterThan(viewport.height - 160) // above the mobile tab bar
})

test('opens a chat, sends a message and shows the reply', async ({ page }) => {
  const requests = mockCoach(page)
  await page.getByTestId('ai-coach-btn').click()
  const panel = page.getByTestId('coach-panel')
  await expect(panel).toBeVisible()

  await panel.getByTestId('coach-input').fill('Help me run a 5K')
  await panel.getByTestId('coach-send').click()

  await expect(panel.locator('[data-role="user"]').last()).toHaveText('Help me run a 5K')
  await expect(panel.locator('[data-role="model"]').last()).toContainText('Great goal!')
  await expect(panel.getByTestId('coach-suggestion')).toHaveCount(1)

  // The whole conversation is sent, ending with the user's message
  expect(requests[0].messages.at(-1)).toEqual({ role: 'user', text: 'Help me run a 5K' })
})

test('remembers the conversation across turns', async ({ page }) => {
  const requests = mockCoach(page, { reply: 'What time do you usually sleep?', suggestions: [] })
  await page.getByTestId('ai-coach-btn').click()
  const panel = page.getByTestId('coach-panel')

  await panel.getByTestId('coach-chip').filter({ hasText: 'I want to sleep better' }).click()
  await expect(panel.locator('[data-role="model"]').last()).toHaveText('What time do you usually sleep?')
  await panel.getByTestId('coach-input').fill('Around 2am')
  await panel.getByTestId('coach-send').click()
  await expect(panel.locator('[data-role="user"]')).toHaveCount(2)

  // Second request carries both user turns and the coach's question
  await expect.poll(() => requests.length).toBe(2)
  expect(requests[1].messages.map((m) => m.role)).toEqual(['user', 'model', 'user'])
})

test('adding a suggestion creates the habit', async ({ page }) => {
  mockCoach(page)
  await page.getByTestId('ai-coach-btn').click()
  const panel = page.getByTestId('coach-panel')
  await panel.getByTestId('coach-input').fill('Help me run a 5K')
  await panel.getByTestId('coach-send').click()

  const suggestion = panel.getByTestId('coach-suggestion').first()
  await suggestion.getByTestId('coach-add-btn').click()
  await expect(suggestion.getByTestId('coach-add-btn')).toHaveText(/Added/)
  await expect(suggestion.getByTestId('coach-add-btn')).toBeDisabled()

  await page.keyboard.press('Escape')
  await expect(panel).toHaveCount(0)
  await expect(page.getByTestId('habit-card').filter({ hasText: SUGGESTED })).toBeVisible()

  // Saved for real: still there after a reload
  await page.reload()
  await expect(page.getByTestId('habit-card').filter({ hasText: SUGGESTED })).toBeVisible()
})

test('shows an error with a retry when the coach fails', async ({ page }) => {
  let calls = 0
  await page.route('**/api/ai/coach-chat', (route) => {
    calls++
    return calls === 1
      ? route.fulfill({ status: 502, json: { message: 'Gemini API Error: overloaded' } })
      : route.fulfill({ json: { reply: 'Back online!', suggestions: [] } })
  })
  await page.getByTestId('ai-coach-btn').click()
  const panel = page.getByTestId('coach-panel')
  await panel.getByTestId('coach-input').fill('Hi coach')
  await panel.getByTestId('coach-send').click()

  await expect(panel.locator('[data-role="error"]')).toContainText('overloaded')
  await panel.getByRole('button', { name: 'Try again' }).click()
  await expect(panel.locator('[data-role="model"]').last()).toHaveText('Back online!')
  await expect(panel.locator('[data-role="error"]')).toHaveCount(0)
})
