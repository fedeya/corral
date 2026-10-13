import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
export default defineConfig({
  testDir: '.', testMatch: ['desk-storm-audio.spec.ts', 'desk-storm-cancellation.spec.ts', 'desk-storm.spec.ts', 'desk-lamp.spec.ts', 'desk-music.spec.ts', 'desk-sound.spec.ts'],
  outputDir: join(tmpdir(), 'corral-storm-audio'), workers: 2, timeout: 60_000,
  use: { baseURL: 'http://localhost:5190' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }, { name: 'webkit', use: { browserName: 'webkit' } }],
});
