import {expect,test} from '@playwright/test';
for(const width of [1440,390]){
 test(`the Stream Deck can be inspected without resetting agents (${width}px)`,async({page})=>{
  await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/?concept=desk');await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  await page.getByRole('button',{name:'Zoom in on the Stream Deck',exact:true}).click();
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view','device');
  const device=await page.getByRole('region',{name:'Corral on the illustrated Stream Deck Plus'}).boundingBox();
  expect(device!.width).toBeGreaterThan(width<760?240:550);
  expect(device!.x).toBeGreaterThanOrEqual(0);expect(device!.y).toBeGreaterThanOrEqual(0);
  expect(device!.x+device!.width).toBeLessThanOrEqual(width);
  await expect(page.getByRole('button',{name:/^Desk key web —/,exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Switch device theme',exact:true}).click();
  await expect(page.locator('.desk-page')).toHaveAttribute('data-theme','kingdom');
  await page.getByRole('button',{name:'Back to the desk ↙',exact:true}).click();
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view','room');
  await page.getByRole('button',{name:'Zoom in on the Stream Deck',exact:true}).click();
  await page.getByRole('button',{name:/^Desk key api —/,exact:true}).click();
  if(width<760) {
   await expect(page.locator('.desk-page')).toHaveAttribute('data-view','monitor');
   await expect(page.getByRole('combobox',{name:'Focused agent',exact:true})).toHaveValue('0');
   await expect(page.getByRole('button',{name:'Yes, keep it',exact:true})).toBeVisible();
   await page.getByRole('button',{name:'Back to the desk ↙',exact:true}).click();
   await expect(page.locator('.desk-page')).toHaveAttribute('data-view','room');
   return;
  }
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view','device');
  await expect(page.getByRole('button',{name:/^Desk key api —/,exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.desk-page')).toHaveAttribute('data-api-status','blocked');
  const surround=page.getByRole('button',{name:'Back to the desk from the Stream Deck surround',exact:true});
  await expect(surround.locator('span')).toHaveCSS('opacity','0');
  await surround.hover({position:{x:8,y:180}});
  await expect(surround.locator('span')).toHaveCSS('opacity','1');
  await surround.click({position:{x:8,y:180}});
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view','room');
 });
}
