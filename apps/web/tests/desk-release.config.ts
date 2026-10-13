import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Full release boundary against an existing preview, with no server ownership.
export default defineConfig({
  testDir: '.',
  outputDir: join(tmpdir(), 'corral-desk-release'),
  workers: 2,
  timeout: 120_000,
  use: { baseURL: process.env.DESK_BASE_URL ?? 'http://localhost:5190', browserName: 'chromium', screenshot: 'only-on-failure' },
});
