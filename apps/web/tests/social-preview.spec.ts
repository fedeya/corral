import {expect,test} from '@playwright/test';

test('the root landing ships its favicon and social preview assets',async({page,request})=>{
  await page.goto('/');
  await expect(page.getByRole('button',{name:'Step inside',exact:true})).toBeVisible();
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href',/\/favicon\.svg$/);
  const favicon=await request.get('/favicon.svg');expect(favicon.ok()).toBe(true);expect(await favicon.text()).toContain('<svg');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content',/\/og\.png$/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content','summary_large_image');
  const image=await request.get('/og.png');expect(image.ok()).toBe(true);
  const png=await image.body();expect(png.readUInt32BE(16)).toBe(1200);expect(png.readUInt32BE(20)).toBe(630);
  expect(await page.evaluate(()=>Array.from(document.querySelectorAll('a')).some(link=>/concept=(world|reveal|manual|playground|original)/.test(link.href)))).toBe(false);
});
