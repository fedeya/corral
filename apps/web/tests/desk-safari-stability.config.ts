import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
export default defineConfig({
  testDir: '.',
  testMatch: ['desk-safari-stability.spec.ts'],
  outputDir: join(tmpdir(), 'corral-safari-stability-tests'),
  workers: 1,
  timeout: 120_000,
  use: { baseURL: process.env.DESK_BASE_URL ?? 'http://localhost:5190', hasTouch: true, screenshot: 'only-on-failure' },
  projects: [{ name: 'webkit-phone', use: { browserName: 'webkit', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true } }, { name: 'chromium-phone', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true } }],
});
