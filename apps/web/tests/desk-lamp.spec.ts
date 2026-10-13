import { expect, test } from '@playwright/test';

for (const width of [390, 1440]) {
 test(`lamp ambience restores room and preserves controls at ${width}px`, async ({ page }, info) => {
  await page.setViewportSize({width,height:width===390?844:1000});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/?concept=desk');
  await page.getByRole('button',{name:'Mute desk sound',exact:true}).click();
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  const art=page.locator('.desk-art');
  await expect(art).toHaveClass(/desk-art--lit/);
  const warmth=page.locator('.desk-art-wall-warmth');
  expect(await warmth.getAttribute('fill')).toMatch(/^url\(#.+-lamp-warmth\)$/);
  const falloff=page.locator('radialGradient[id$="-lamp-warmth"] stop').last();
  await expect(falloff).toHaveAttribute('stop-opacity','0');
  await page.screenshot({path:info.outputPath(`on-${width}.png`)});
  const dark=page.locator('.desk-art-room-darkness');
  await expect(dark).toHaveCSS('opacity','0');
  const lamp=page.getByRole('button',{name:'Switch the desk lamp',exact:true});
  await lamp.focus(); await page.keyboard.press('Enter');
  await expect(art).not.toHaveClass(/desk-art--lit/);
  await expect(dark).toHaveCSS('opacity','0.52');
  await expect(page.locator('.desk-art-storm')).toHaveCSS('opacity','1');
  await expect(page.locator('.desk-art-rain-drop').first()).toHaveCSS('animation-name','none');
  await expect(page.locator('.desk-art-lightning')).toHaveCSS('animation-name','none');
  await page.getByRole('button',{name:'Look through the window',exact:true}).click();
  await expect(page.locator('.desk-dialogue-typed')).toContainText('silhouette');
  await expect(page.locator('.desk-art-visitor-silhouette')).toHaveCSS('opacity','1');
  await page.screenshot({path:info.outputPath(`off-${width}.png`)});
  const complete=page.getByRole('button',{name:'Complete dialogue',exact:true}); if(await complete.isVisible()) await complete.click();
  const dismiss=page.getByRole('button',{name:'Dismiss dialogue',exact:true}); if(await dismiss.isVisible()) await dismiss.click();
  if(width===390) {
   await page.getByRole('button',{name:'Zoom in on the Stream Deck',exact:true}).click();
   await page.screenshot({path:info.outputPath('dark-device.png')});
  }
  await page.getByRole('button',{name:'Desk key api',exact:true}).click();
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view','monitor');
  await expect(page.getByRole('button',{name:'Open terminal',exact:true})).toBeVisible();
  await page.screenshot({path:info.outputPath(`dark-monitor-${width}.png`)});
  await page.getByRole('button',{name:'Back to the desk ↙',exact:true}).click();
  await lamp.focus(); await page.keyboard.press('Enter');
  await expect(dark).toHaveCSS('opacity','0');
  await expect(page.locator('.desk-art-storm')).toHaveCSS('opacity','0');
  await expect(page.locator('.desk-art-visitor-silhouette')).toHaveCSS('opacity','0');
  await page.screenshot({path:info.outputPath(`restored-${width}.png`)});
 });
}

test('storm has one gentle pulse, clips rain to window and stops when hidden or lit', async ({ page }, info) => {
 await page.setViewportSize({width:1440,height:1000});
 await page.goto('/?concept=desk');
 await page.getByRole('button',{name:'Mute desk sound',exact:true}).click();
 await page.getByRole('button',{name:'Skip intro',exact:true}).click();
 await page.waitForTimeout(1700);
 await page.getByRole('button',{name:'Switch the desk lamp',exact:true}).click();
 const flash=page.locator('.desk-art-lightning');
 await expect(flash).toHaveCSS('animation-name','desk-storm-lightning');
 await expect(page.locator('.desk-art-rain-drop').first()).toHaveCSS('animation-name','desk-storm-rain');
 expect(await page.locator('.desk-art-storm').evaluate(element => element.parentElement?.getAttribute('clip-path'))).toMatch(/window-glass/);
 await page.waitForTimeout(750);
 // Sample the actual animation at its single low-intensity peak, not an invented style.
 await flash.evaluate(element => { const animation=element.getAnimations()[0]; animation.pause(); animation.currentTime=7285; });
 await expect.poll(async()=>Number(await flash.evaluate(element=>getComputedStyle(element).opacity))).toBeCloseTo(.09,2);
 await page.screenshot({path:info.outputPath('desktop-lightning.png')});
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(flash).toHaveCSS('animation-name','none');
 await expect(page.locator('.desk-art-rain-drop').first()).toHaveCSS('animation-name','none');
 await page.evaluate(()=>{delete (document as unknown as {hidden?:boolean}).hidden;document.dispatchEvent(new Event('visibilitychange'));});
 await expect(flash).toHaveCSS('animation-name','desk-storm-lightning');
 await page.getByRole('button',{name:'Switch the desk lamp',exact:true}).click();
 await expect(flash).toHaveCSS('animation-name','none');
 await expect(page.locator('.desk-art-rain-drop').first()).toHaveCSS('animation-name','none');
 await expect(page.locator('.desk-art-room-darkness')).toHaveCSS('opacity','0');
});
