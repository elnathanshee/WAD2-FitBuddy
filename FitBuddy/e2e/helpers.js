import { expect } from '@playwright/test'

// Every habit created by a test starts with this prefix, so cleanup can find
// (and only delete) test data — never the seeded demo habits.
export const TEST_PREFIX = 'E2E '
export const USER_HEADERS = { 'x-user-id': '1' } // the mock login user

export function uniqueHabitName(label) {
  return `${TEST_PREFIX}${label} ${Date.now()}`
}

// 'YYYY-MM-DD' for the local day, n days from today (the browser runs on the
// same machine, so it agrees on what "today" is).
export function dateKey(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// The Monday of the week containing a 'YYYY-MM-DD' date (weeks run Monday–Sunday)
export function weekStartKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d, 12)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// The seeded demo account (server/seedNeon.js); its user id is '1'
export const DEMO_EMAIL = 'demo@fitbuddy.com'
export const DEMO_PASSWORD = 'password123'

export async function login(page) {
  await page.goto('/login')
  await page.locator('#email').fill(DEMO_EMAIL)
  await page.locator('#password').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: 'Log In' }).click()
  // Home is the first page after login. The database is remote (Neon), so allow
  // for the occasional slow login request.
  await expect(page).toHaveURL(/\/home/, { timeout: 15_000 })
}

// --- API shortcuts: set up state quickly so each UI test only exercises the
// --- feature it is about (Arrange via API, Act + Assert via UI).

export async function createHabitViaApi(request, overrides = {}, headers = USER_HEADERS) {
  const res = await request.post('/api/habits', {
    headers,
    data: {
      name: uniqueHabitName('habit'),
      category: 'exercise',
      frequency: 'daily',
      target: { amount: 1, unit: 'times' },
      ...overrides,
    },
  })
  expect(res.status(), await res.text()).toBe(201)
  return res.json()
}

export async function checkInViaApi(request, habitId, date, count = 1, headers = USER_HEADERS) {
  const res = await request.post(`/api/habits/${habitId}/checkins`, {
    headers,
    data: { date, count },
  })
  expect(res.ok(), await res.text()).toBeTruthy()
}

export async function deleteTestHabits(request, headers = USER_HEADERS) {
  const res = await request.get('/api/habits', { headers })
  if (!res.ok()) return
  for (const habit of await res.json()) {
    if (habit.name.startsWith(TEST_PREFIX)) {
      await request.delete(`/api/habits/${habit._id}`, { headers })
    }
  }
}
