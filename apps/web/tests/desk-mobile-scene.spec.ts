import {expect,test} from '@playwright/test';
for(const width of [320,390]) {
 test(`objects are directly tappable on the mobile room at ${width}`,async({page})=>{
  await page.setViewportSize({width,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  await expect(page.getByText('Things on the desk',{exact:true})).toHaveCount(0);
  for(const object of await page.locator('.desk-object').all()) {
   expect(await object.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
  }
  const duck=page.getByRole('button',{name:'Ask the rubber duck',exact:true});
  await expect(duck).toBeVisible();
  await duck.scrollIntoViewIfNeeded();
  const box=await duck.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(43.9);expect(box!.height).toBeGreaterThanOrEqual(43.9);
  await duck.tap();
  await expect(page.locator('.desk-dialogue')).toContainText('expected to happen');
 });
 test(`mobile monitor owns a clean readable surface at ${width}`,async({page})=>{
  await page.setViewportSize({width,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  await page.getByRole('button',{name:'Focus monitor ↗',exact:true}).click();
  const workspace=page.getByRole('region',{name:'Readable mobile monitor'});
  await expect(workspace).toBeVisible();
  // The world remains mounted for the camera handoff, but cannot steal input.
  await expect(page.locator('.desk-scene')).toHaveCSS('pointer-events','none');
  await expect(workspace).toHaveCSS('opacity','1');
  const box=await workspace.boundingBox();expect(box!.width).toBeGreaterThan(width-20);
  await expect(page.getByRole('button',{name:'Yes, keep it',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Yes, keep it',exact:true}).tap();
  await expect(page.locator('.desk-page')).toHaveAttribute('data-api-status','working');
  await page.getByRole('button',{name:'Back to the desk ↙',exact:true}).tap();
  await expect(page.getByRole('button',{name:'Ask the rubber duck',exact:true})).toBeVisible();
 });
}
test.use({hasTouch:true});
