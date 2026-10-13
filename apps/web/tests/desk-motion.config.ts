import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Reuse the owner's live desk preview; never restart it for regression checks.
export default defineConfig({
  testDir: '.',
  testMatch: ['desk-mobile-polish.spec.ts', 'desk-monitor-motion.spec.ts', 'desk-entry.spec.ts', 'desk-mobile*.spec.ts'],
  outputDir: join(tmpdir(), 'corral-desk-motion'),
  workers: 2,
  use: { baseURL: process.env.DESK_BASE_URL ?? 'http://localhost:5190', hasTouch: true },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }, { name: 'webkit', use: { browserName: 'webkit' } }],
});
