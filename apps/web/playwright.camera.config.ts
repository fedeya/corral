import {defineConfig,devices} from '@playwright/test';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

// Exercise a running preview without competing with the main test webServer.
export default defineConfig({
  testDir:'./tests',
  outputDir:join(tmpdir(),'corral-camera-tests'),
  workers:2,
  use:{baseURL:process.env.CORRAL_CAMERA_URL ?? 'http://127.0.0.1:5190'},
  projects:[
    {name:'chromium',use:{...devices['Desktop Chrome']}},
    {name:'webkit',use:{browserName:'webkit',hasTouch:true,isMobile:true,viewport:{width:390,height:844}}},
  ],
});
