import {expect,test} from '@playwright/test';

test('Tab in monitor zoom cannot focus off-camera device controls or scroll the camera',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  await page.locator('.desk-monitor-frame [data-edge=bottom]').click();
  const screenBefore=(await page.locator('.desk-screen-aperture').boundingBox())!;
  await page.getByRole('button',{name:'Install from the monitor',exact:true}).focus();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(()=>document.activeElement?.closest('.desk-device')!==null)).toBe(false);
  expect(await page.locator('.desk-viewport').evaluate(element=>element.scrollTop)).toBe(0);
  expect((await page.locator('.desk-screen-aperture').boundingBox())!.y).toBeCloseTo(screenBefore.y,1);
  await page.getByRole('button',{name:'Back to the desk ↙',exact:true}).click();
  await page.getByRole('button',{name:'Zoom in on the Stream Deck',exact:true}).click();
  await page.getByRole('button',{name:'Desk key api',exact:true}).focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('button',{name:'Desk key api',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view','device');
});
