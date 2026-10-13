import { expect, test } from '@playwright/test';

for (const width of [1440, 320, 390]) test(`Zac prototype direct touch, matching portrait and unchanged room at ${width}`, async ({page}, info) => {
  await page.setViewportSize({width, height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/?concept=desk');
  await page.getByRole('button',{name:'Mute desk sound',exact:true}).click();
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  const head = page.locator('.desk-art [data-prop-art="zac"]');
  const target = page.getByRole('button',{name:'Wake the Zac prototype',exact:true});
  await expect(target).toBeVisible();
  // Original vector art shares the existing room/portrait geometry, without sprites.
  await expect(head.locator('image')).toHaveCount(0);
  await expect(head.locator('text')).toHaveCount(0);
  await expect(head).toHaveAttribute('transform','translate(294 748)');
  await expect(head.locator('[data-zac-eyes]')).toHaveAttribute('data-zac-eyes','off');
  const vectorBounds = await head.locator('path, rect').evaluateAll(elements => {
    const boxes=elements.map(el => (el as unknown as SVGGraphicsElement).getBBox());
    const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));
    return {x,y,width:Math.max(...boxes.map(b=>b.x+b.width))-x,height:Math.max(...boxes.map(b=>b.y+b.height))-y};
  });
  expect(vectorBounds.x).toBeGreaterThanOrEqual(0);
  expect(vectorBounds.y).toBeGreaterThanOrEqual(0);
  expect(vectorBounds.x+vectorBounds.width).toBeLessThanOrEqual(98);
  expect(vectorBounds.y+vectorBounds.height).toBeLessThanOrEqual(104);
  await expect(head).toHaveAttribute('data-awake','false');
  const before = await page.locator('.desk-scene').getAttribute('style');
  const bounds = await head.boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.click(bounds!.x+bounds!.width/2,bounds!.y+bounds!.height/2);
  await expect(head).toHaveAttribute('data-awake','true');
  await expect(page.locator('.desk-dialogue-message')).toHaveText('Not ready to host yet.');
  await expect(page.locator('.desk-dialogue-speaker')).toHaveText('ZAC / PROTOTYPE');
  const portrait = page.getByRole('img',{name:'Zac prototype portrait',exact:true});
  await expect(portrait).toBeVisible();
  await expect(portrait.locator('[data-prop-art]')).toHaveCount(1);
  await expect(portrait.locator('image')).toHaveCount(0);
  await expect(portrait.locator('[data-zac-eyes]')).toHaveAttribute('data-zac-eyes','awake');
  expect(await portrait.locator('[data-prop-art="zac"]').innerHTML()).toBe(await head.innerHTML());
  await portrait.screenshot({path:info.outputPath(`zac-portrait-${width}.png`)});
  expect(await page.locator('.desk-scene').getAttribute('style')).toBe(before);
  await page.screenshot({path:info.outputPath(`zac-room-${width}.png`)});
  await head.screenshot({path:info.outputPath(`zac-detail-${width}.png`)});
  await page.getByRole('button',{name:'Close dialogue',exact:true}).click();
  // Adding a nearby 44px mobile target must not steal any original prop center.
  const intercepted = await page.locator('.desk-object').evaluateAll(els => els.filter(el => {
    const b=el.getBoundingClientRect();return document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest('button') !== el;
  }).map(el=>el.getAttribute('aria-label')));
  expect(intercepted).toEqual([]);
  await page.getByRole('button',{name:'Switch the desk lamp',exact:true}).click();
  await page.getByRole('button',{name:'Close dialogue',exact:true}).click();
  await expect(page.locator('.desk-page')).toHaveAttribute('data-lamp','off');
  await expect(head).toHaveAttribute('data-awake','true');
  await page.screenshot({path:info.outputPath(`zac-dark-${width}.png`)});
  await target.click();
  await expect(head).toHaveAttribute('data-awake','false');
  await expect(portrait.locator('[data-zac-eyes]')).toHaveAttribute('data-zac-eyes','off');
  expect(await portrait.locator('[data-prop-art="zac"]').innerHTML()).toBe(await head.innerHTML());
  expect(await page.locator('.desk-scene').getAttribute('style')).toBe(before);
  await page.getByRole('button',{name:'Replay',exact:true}).click();
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  await expect(head).toHaveAttribute('data-awake','false');
});
