import {defineConfig} from '@playwright/test';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

export default defineConfig({
  testDir:'.',testMatch:'desk-zac*.spec.ts',workers:2,
  outputDir:join(tmpdir(),'corral-zac-native'),
  use:{baseURL:'http://127.0.0.1:4175',viewport:{width:1440,height:844}},
  projects:[{name:'chromium',use:{browserName:'chromium'}},{name:'webkit',use:{browserName:'webkit'}}],
  webServer:{command:'bun run preview --host 127.0.0.1 --port 4175 --strictPort',url:'http://127.0.0.1:4175',reuseExistingServer:false},
});
