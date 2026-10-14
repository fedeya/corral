import {expect,test} from '@playwright/test';

test('Step inside starts the room soundtrack before the first spoken dialogue',async({page})=>{
  await page.addInitScript(()=>{
    const Native=AudioContext;const audio={contexts:[] as AudioContext[],blips:0,starts:[] as string[]};Object.assign(window,{entryAudio:audio});
    window.AudioContext=class extends Native{constructor(){super();audio.contexts.push(this);}override createOscillator(){audio.blips++;audio.starts.push(this.state);return super.createOscillator();}};
  });
  await page.goto('/?concept=desk');
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view','entry');
  await expect(page.locator('.desk-dialogue')).toHaveCount(0);
  expect(await page.evaluate(()=>(window as unknown as {entryAudio:{contexts:AudioContext[]}}).entryAudio.contexts.length)).toBe(0);
  await page.getByRole('button',{name:'Step inside',exact:true}).click();
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view','closeup');
  await expect(page.locator('.desk-entry')).toHaveCount(0);
  await expect(page.locator('.desk-dialogue')).toContainText('Psst');
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {entryAudio:{blips:number}}).entryAudio.blips)).toBeGreaterThan(0);
  expect(await page.evaluate(()=>(window as unknown as {entryAudio:{starts:string[]}}).entryAudio.starts.every(state=>state==='running'))).toBe(true);
  await page.getByRole('button',{name:/^Help agent api —/,exact:true}).click();
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view',page.viewportSize()!.width<=760?'monitor':'room');
});

for(const width of [320,1440])test(`entry supports muted keyboard activation at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:800});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/?concept=desk');
  await page.getByRole('button',{name:'Mute desk sound',exact:true}).click();
  await page.getByRole('button',{name:'Step inside',exact:true}).focus();await page.keyboard.press('Enter');
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view','closeup');
  await expect(page.locator('.desk-dialogue-typed')).toHaveAttribute('data-typing','false');
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight && document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('installation bypasses the entry and missing Web Audio never traps the visitor',async({page})=>{
  await page.goto('/?concept=desk');await page.getByRole('button',{name:'Open install guide',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Install Corral',exact:true})).toBeVisible();
  await expect(page.locator('.desk-entry')).toHaveCount(0);
  await page.addInitScript(()=>{Object.defineProperty(window,'AudioContext',{value:undefined,configurable:true});});
  await page.goto('/?concept=desk');await page.getByRole('button',{name:'Step inside',exact:true}).click();
  await expect(page.locator('.desk-dialogue')).toContainText('Psst');
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view','closeup');
});
