import { expect, test } from '@playwright/test';

for (const [width,height] of [[1440,1000],[1280,720],[900,650],[390,844],[320,568]]) {
  test(`the whole desk fits ${width}×${height} without page scrolling`, async ({page}) => {
    await page.setViewportSize({width,height});
    await page.goto('/?concept=desk');
    await expect(page.locator('.desk-page footer')).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Next agent',exact:true})).toHaveCount(0);
    await page.getByRole('button',{name:'Skip intro',exact:true}).click();
    await page.evaluate(()=>document.fonts.ready);
    expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight && document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.getByRole('button',{name:'Open install guide',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Install Corral',exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
  });
}

test('RPG dialogue types, can be completed, and supports muting and generated blips', async ({page}) => {
  await page.addInitScript(()=>{
    const Native=window.AudioContext; const contexts:AudioContext[]=[];let blips=0;
    Object.assign(window,{deskVoiceTest:{contexts,get blips(){return blips;}}});
    window.AudioContext=class extends Native {constructor(options?:AudioContextOptions){super(options);contexts.push(this);} override createOscillator(){blips++;return super.createOscillator();}};
  });
  await page.goto('/?concept=desk');
  const typing=page.locator('.desk-dialogue-typed');
  expect(await page.evaluate(()=>(window as unknown as {deskVoiceTest:{contexts:AudioContext[]}}).deskVoiceTest.contexts.length)).toBe(0);
  await page.getByRole('button',{name:'Mute desk sound',exact:true}).click();
  await page.getByRole('button',{name:'Step inside',exact:true}).click();
  await expect(typing).toHaveAttribute('data-typing','true');
  await page.getByRole('button',{name:'Enable desk sound',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {deskVoiceTest:{blips:number}}).deskVoiceTest.blips)).toBeGreaterThan(0);
  await page.getByRole('button',{name:'Complete dialogue',exact:true}).click();
  await expect(typing).toHaveAttribute('data-typing','false');
  await page.getByRole('button',{name:'Mute desk sound',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {deskVoiceTest:{contexts:AudioContext[]}}).deskVoiceTest.contexts.map(c=>c.state))).toEqual(['closed']);
});

test('object feedback uses the same bottom dialogue rather than floating tooltips',async({page})=>{
  await page.goto('/?concept=desk');
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  await page.getByRole('button',{name:'Ask the rubber duck',exact:true}).click();
  await expect(page.locator('.desk-dialogue')).toContainText('expected to happen');
  await expect(page.locator('.desk-dialogue-typed')).toHaveAttribute('data-typing','true');
  await expect(page.locator('.desk-objects-status')).not.toBeVisible();
});

test('reduced motion shows the complete dialogue without character delays',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/?concept=desk');
  await page.getByRole('button',{name:'Step inside',exact:true}).click();
  await expect(page.locator('.desk-dialogue-typed')).toHaveAttribute('data-typing','false');
  await expect(page.locator('.desk-dialogue-typed')).toContainText('keyboard');
});
