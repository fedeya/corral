import {expect,test} from '@playwright/test';

test('the night sky and apartment windows move and glow independently',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  await expect(page.locator('.desk-art-star')).toHaveCount(8);
  await expect(page.locator('.desk-art-moon')).toHaveCount(1);
  await expect(page.locator('.desk-art-apartment-light')).toHaveCount(6);
  const samples=await page.evaluate(()=>{
    return ['.desk-art-star','.desk-art-moon','.desk-art-apartment-light'].map(selector=>{
      const element=document.querySelector(selector)!;
      const animation=element.getAnimations()[0];
      animation.pause();animation.currentTime=0;
      const before=getComputedStyle(element);const first={opacity:before.opacity,transform:before.transform,filter:before.filter};
      animation.currentTime=Number(animation.effect!.getTiming().duration)/2;
      const after=getComputedStyle(element);
      return {first,second:{opacity:after.opacity,transform:after.transform,filter:after.filter}};
    });
  });
  for(const sample of samples) expect(sample.first).not.toEqual(sample.second);
  const delays=await page.locator('.desk-art-apartment-light').evaluateAll(elements=>elements.map(element=>getComputedStyle(element).animationDelay));
  expect(new Set(delays).size).toBeGreaterThan(1);
});

test('the sky stays static when reduced motion is requested',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await expect(page.locator('.desk-art-star')).toHaveCount(8);
  for(const selector of ['.desk-art-star','.desk-art-moon','.desk-art-apartment-light']) {
    expect(await page.locator(selector).first().evaluate(element=>getComputedStyle(element).animationName)).toBe('none');
  }
});
