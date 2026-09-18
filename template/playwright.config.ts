import { defineConfig } from '@playwright/test';
// Roda contra o nginx local (build/ já gerado) e o PocketBase real; os testes desfazem o que mudam.
export default defineConfig({
  testDir: 'tests/e2e', timeout: 60000, retries: 0, workers: 1, fullyParallel: false,
  use: { baseURL: process.env.ATLAS_URL || 'http://localhost:4173', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1400, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, testMatch: /mobile|gate|alias/ }
  ]
});
