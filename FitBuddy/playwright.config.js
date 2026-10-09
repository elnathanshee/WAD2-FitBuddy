import { defineConfig, devices } from '@playwright/test'

// End-to-end tests for HabitBuddy. See e2e/README.md for how to run them.
export default defineConfig({
  testDir: './e2e',
  // All tests share the mock user's data in one database, so run them one at a
  // time to keep them independent and repeatable.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    // Smallest viewport the graders test with (iPhone 6/7/8: 375 × 667)
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 667 }, hasTouch: true } },
  ],
  // Starts both servers if they aren't already running.
  webServer: [
    {
      command: 'npm run dev --prefix ../server',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'pnpm dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
})
