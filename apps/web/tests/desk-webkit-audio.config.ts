import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// The parent owns shared browser checks; this suite uses its already-running
// desk server without starting or stopping the shared Playwright webServer.
export default defineConfig({
  testDir: '.',
  testMatch: 'desk-webkit-audio.spec.ts',
  outputDir: join(tmpdir(), 'corral-webkit-audio-tests'),
  workers: 1,
  use: { baseURL: process.env.DESK_AUDIO_URL ?? 'http://localhost:5190' },
});
