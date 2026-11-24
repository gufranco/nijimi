import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'display-engines',
    include: ['src/display/createGlDisplay.test.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'webkit' }]
    }
  }
});
