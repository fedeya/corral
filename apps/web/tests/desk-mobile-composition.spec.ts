import {expect,test} from '@playwright/test';
test.use({hasTouch:true});
for (const width of [320,390]) {
 test(`original room camera leads through device keys and back at ${width}`,async({page})=>{
  await page.setViewportSize({width,height:844});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');await page.getByRole('button',{name:'Skip intro',exact:true}).tap();
  await expect(page.locator('.desk-mobile-art')).toHaveCount(0);
  await expect(page.locator('.desk-art')).toHaveAttribute('viewBox','0 0 1600 1100');
  expect(await page.locator('.desk-viewport').evaluate(el=>[el.scrollWidth-el.clientWidth,el.scrollHeight-el.clientHeight])).toEqual([0,0]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
  const scene=await page.locator('.desk-scene').getAttribute('style');
  const device=page.getByRole('button',{name:'Zoom in on the Stream Deck',exact:true});
  const d=(await device.boundingBox())!;expect(d.width).toBeGreaterThanOrEqual(44);expect(d.height).toBeGreaterThanOrEqual(44);
  await device.tap();await expect(page.locator('.desk-page')).toHaveAttribute('data-view','device');
  await expect(device).toHaveCount(0);
  for(const key of await page.locator('.desk-key').all()) {
   const b=(await key.boundingBox())!;expect(b.width).toBeGreaterThanOrEqual(43.9);expect(b.height).toBeGreaterThanOrEqual(43.9);
   expect(await key.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
  }
  await page.getByRole('button',{name:/^Desk key web —/,exact:true}).tap();
  await expect(page.getByRole('region',{name:'Readable mobile monitor'})).toBeVisible();
  await expect(page.getByRole('combobox',{name:'Focused agent'})).toHaveValue('1');
  await page.getByRole('button',{name:'Back to the desk ↙',exact:true}).tap();
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view','room');
  await expect(page.locator('.desk-scene')).toHaveAttribute('style',scene!);
 });
 test(`illustrated monitor is directly tappable at ${width}`,async({page})=>{
  await page.setViewportSize({width,height:844});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');await page.getByRole('button',{name:'Skip intro',exact:true}).tap();
  await page.getByRole('button',{name:'Focus illustrated monitor',exact:true}).tap();
  await expect(page.getByRole('region',{name:'Readable mobile monitor'})).toBeVisible();
 });
 test(`full goat frame fits opening portrait at ${width}`,async({page})=>{
  await page.setViewportSize({width,height:844});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');await page.getByRole('button',{name:'Mute desk sound',exact:true}).tap();await page.getByRole('button',{name:'Step inside',exact:true}).tap();
  await expect(page.locator('.desk-dialogue')).toContainText('Need your call');
  const portrait=(await page.locator('.desk-dialogue-portrait').boundingBox())!;const sprite=(await page.locator('.desk-dialogue-portrait .xp-critter').boundingBox())!;
  expect(sprite.x).toBeGreaterThanOrEqual(portrait.x+1);expect(sprite.x+sprite.width).toBeLessThanOrEqual(portrait.x+portrait.width-1);
  expect(sprite.y).toBeGreaterThanOrEqual(portrait.y+1);expect(sprite.y+sprite.height).toBeLessThanOrEqual(portrait.y+portrait.height-1);
 });
}
