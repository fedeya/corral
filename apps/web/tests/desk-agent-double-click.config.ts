import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export default defineConfig({
  testDir: '.',
  testMatch: ['desk-agent-double-click.spec.ts', 'desk-device-zoom.spec.ts', 'desk-camera-focus.spec.ts', 'desk-escape.spec.ts', 'desk-dialogue-keyboard.spec.ts'],
  outputDir: join(tmpdir(), 'corral-agent-double-click'),
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:4186' },
  webServer: { command: 'bun run dev --host 127.0.0.1 --port 4186 --strictPort', url: 'http://127.0.0.1:4186', reuseExistingServer: false, cwd: '..' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }, { name: 'webkit', use: { browserName: 'webkit' } }],
});
