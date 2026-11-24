import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const DELIBERATE_LOG = 'browserDeps logs this on purpose';

export default defineConfig({
  optimizeDeps: {
    include: ['zod']
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: [
            'src/signal/**/*.test.ts',
            'src/settings/**/*.test.ts',
            'src/i18n/**/*.test.ts',
            'src/logging/**/*.test.ts',
            'tests/fixtures/**/*.test.ts',
            'tests/matrix/**/*.test.ts'
          ],
          environment: 'node'
        }
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: [
            'src/display/**/*.test.ts',
            'src/input/**/*.test.ts',
            'src/clip/**/*.test.ts',
            'src/ui/**/*.test.ts',
            'src/worker/**/*.test.ts',
            'src/main.test.ts'
          ],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({
              launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
              contextOptions: { permissions: ['clipboard-read', 'clipboard-write'] }
            }),
            instances: [{ browser: 'chromium' }]
          }
        }
      }
    ],
    onUnhandledError: (error) => (error.message.includes(DELIBERATE_LOG) ? false : undefined),
    onConsoleLog: (log) => (log.includes(DELIBERATE_LOG) ? false : undefined),
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.ts', 'src/**/*.spec.ts'],
      reporter: ['text', 'json-summary'],
      thresholds: {
        perFile: true,
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100
      }
    }
  }
});
