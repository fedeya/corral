import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
export default defineConfig({
 testDir: '.', testMatch: ['desk-storm.spec.ts','desk-lamp.spec.ts','desk-safari-stability.spec.ts','desk-special.spec.ts','desk-author.spec.ts','desk-room.spec.ts','desk-cables.spec.ts','desk-night-sky.spec.ts','desk-mobile-scene.spec.ts','desk-mobile-composition.spec.ts','desk-entry.spec.ts'],
 outputDir: join(tmpdir(),'corral-lamp-evidence'), workers: 2, timeout:120_000,
 use:{baseURL:'http://localhost:5190', screenshot:'only-on-failure'},
 projects:[{name:'webkit',use:{browserName:'webkit'}},{name:'chromium',use:{browserName:'chromium'}}],
});
