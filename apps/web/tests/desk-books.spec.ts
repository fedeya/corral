import {expect,test} from '@playwright/test';

test('the Borges title has breathing room inside its book spine',async({page})=>{
  await page.goto('/');
  const padding=await page.locator('.desk-art text').filter({hasText:'BORGES'}).evaluate(element=>{
    const title=(element as SVGGraphicsElement).getBBox();
    const spine=(element.previousElementSibling!.previousElementSibling as SVGGraphicsElement).getBBox();
    return {top:title.y-spine.y,bottom:spine.y+spine.height-title.y-title.height,left:title.x-spine.x,right:spine.x+spine.width-title.x-title.width};
  });
  for(const value of Object.values(padding)) expect(value).toBeGreaterThanOrEqual(2);
});
