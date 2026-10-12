import { expect,test } from '@playwright/test';

test('clicking a prop dismisses its hover label without stealing keyboard focus',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/?concept=desk');
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  const duck=page.getByRole('button',{name:'Ask the rubber duck',exact:true});
  await duck.hover();await expect(duck.locator('.desk-object-label')).toBeVisible();
  await duck.click();
  await expect(duck.locator('.desk-object-label')).not.toBeVisible();
  await expect(duck).toBeFocused();
  await expect(page.locator('.desk-dialogue')).toContainText('expected');
});

test('sound is armed by default and unlocks on the first ordinary interaction',async({page})=>{
  await page.addInitScript(()=>{
    const Native=window.AudioContext;const contexts:AudioContext[]=[];
    Object.assign(window,{roomAudioContexts:contexts});
    window.AudioContext=class extends Native{constructor(options?:AudioContextOptions){super(options);contexts.push(this);}};
  });
  await page.goto('/?concept=desk');
  await expect(page.getByRole('button',{name:'Mute desk sound',exact:true})).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(()=>(window as unknown as {roomAudioContexts:AudioContext[]}).roomAudioContexts.length)).toBe(0);
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {roomAudioContexts:AudioContext[]}).roomAudioContexts.map(c=>c.state))).toEqual(['running']);
  await page.getByRole('button',{name:'Mute desk sound',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {roomAudioContexts:AudioContext[]}).roomAudioContexts.map(c=>c.state))).toEqual(['closed']);
});

test('the window has a reversible visitor and the ambient wall fills the viewport',async({page})=>{
  await page.setViewportSize({width:1920,height:900});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/?concept=desk');
  await expect(page.locator('.desk-header')).not.toContainText('ILLUSTRATED DEMO');
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  await page.getByRole('button',{name:'Look through the window',exact:true}).click();
  await expect(page.locator('.desk-art-visitor')).toHaveAttribute('data-visible','true');
  await expect(page.locator('.desk-dialogue')).toContainText('watching');
  await page.getByRole('button',{name:'Look through the window',exact:true}).click();
  await expect(page.locator('.desk-art-visitor')).toHaveAttribute('data-visible','false');
  const wall=await page.locator('.desk-ambient-wall').boundingBox();
  const viewport=await page.locator('.desk-viewport').boundingBox();
  expect(wall!.width).toBe(viewport!.width);
  expect(wall!.height).toBe(viewport!.height);
});

test('background terminal log marks have a real gap before working and ready text',async({page})=>{
  await page.goto('/?concept=desk');
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  for(const id of ['auth','billing']) {
    await page.getByRole('button',{name:`Focus ${id} in herdr demo`,exact:true}).click();
    await expect(page.locator('.agent-background-log .agent-log-text')).toBeVisible();
    await expect.poll(()=>page.locator('.agent-background-log').evaluate(element=>{
      const mark=element.querySelector('.agent-log-mark')!.getBoundingClientRect();
      const text=element.querySelector('.agent-log-text')!.getBoundingClientRect();
      return text.x-mark.right;
    })).toBeGreaterThan(3);
  }
});
