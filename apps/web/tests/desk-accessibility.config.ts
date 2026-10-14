import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
export default defineConfig({
  testDir: '.', testMatch: /desk-accessibility\.spec\.ts/, workers: 1,
  outputDir: join(tmpdir(), 'corral-accessibility'),
  use: { baseURL: process.env.CORRAL_A11Y_URL ?? 'http://127.0.0.1:4186' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }, { name: 'webkit', use: { browserName: 'webkit' } }],
});
