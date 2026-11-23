import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE = `http://127.0.0.1:${String(PORT)}/nijimi/`;
const NO_WEBGL_SPEC = /noWebgl\.spec\.ts/;
const WORKERS = 4;
const TEST_TIMEOUT_MS = 90_000;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  workers: WORKERS,
  timeout: TEST_TIMEOUT_MS,
  forbidOnly: true,
  retries: 0,
  reporter: [['list'], ['github']],
  use: { baseURL: BASE, trace: 'retain-on-failure' },
  projects: [
    {
      name: 'chromium',
      testIgnore: NO_WEBGL_SPEC,
      use: { ...devices['Desktop Chrome'], deviceScaleFactor: 2 }
    },
    {
      name: 'firefox',
      testIgnore: NO_WEBGL_SPEC,
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: { firefoxUserPrefs: { 'webgl.force-enabled': true } }
      }
    },
    { name: 'webkit', testIgnore: NO_WEBGL_SPEC, use: { ...devices['Desktop Safari'] } },
    {
      name: 'mobile-320',
      testIgnore: NO_WEBGL_SPEC,
      use: { ...devices['Pixel 7'], viewport: { width: 320, height: 640 } }
    },
    {
      name: 'chromium-no-webgl',
      testMatch: NO_WEBGL_SPEC,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { args: ['--disable-webgl', '--disable-webgl2'] }
      }
    }
  ],
  webServer: {
    command: 'pnpm preview',
    url: BASE,
    reuseExistingServer: false,
    timeout: 60_000
  }
});
