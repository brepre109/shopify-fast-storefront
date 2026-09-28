import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT ?? 3100)
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`

/**
 * E2E tests run against a production build (`next build && next start`), the same
 * thing Lighthouse measures. Set E2E_SKIP_BUILD=1 to reuse an existing .next build,
 * or E2E_BASE_URL to point at an already-running server.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `${process.env.E2E_SKIP_BUILD ? '' : 'npm run build && '}npm run start -- --port ${PORT}`,
        url: BASE_URL,
        timeout: 180_000,
        reuseExistingServer: !process.env.CI,
      },
})
