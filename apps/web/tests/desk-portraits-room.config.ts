import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export default defineConfig({
  testDir: '.',
  testMatch: ['desk-portraits-room.spec.ts','desk-cables.spec.ts','desk-keyboard.spec.ts'],
  outputDir: join(tmpdir(), 'corral-desk-portraits-room'),
  workers: 1,
  timeout: 60_000,
  use: { baseURL: process.env.DESK_BASE_URL ?? 'http://localhost:5190' },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
