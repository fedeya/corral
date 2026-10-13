import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export default defineConfig({
  testDir: '.',
  testMatch: ['desk-escape.spec.ts', 'desk-dialogue-keyboard.spec.ts', 'desk-camera-focus.spec.ts', 'desk-arcade-entry.spec.ts'],
  outputDir: join(tmpdir(), 'corral-desk-escape'),
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:4173' },
  webServer: {command:'bun run dev --host 127.0.0.1 --port 4173 --strictPort',url:'http://127.0.0.1:4173',reuseExistingServer:false,cwd:'..'},
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }, { name: 'webkit', use: { browserName: 'webkit' } }],
});
