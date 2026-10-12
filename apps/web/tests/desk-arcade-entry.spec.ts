import {expect,test} from '@playwright/test';

for(const width of [1440,390]) test(`the controller opens Agent Arcade in the monitor at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  await page.getByRole('button',{name:'Inspect the old game controller',exact:true}).click();
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view','monitor');
  await expect(page.locator('.desk-computer')).toHaveAttribute('data-app','arcade');
  await expect(page.getByRole('link',{name:'agent-arcade on GitHub'})).toHaveAttribute('href','https://github.com/fedeya/agent-arcade');
  const bounds=await page.locator('.desk-app-content').boundingBox();
  for(const selector of ['.desk-arcade-controls','.desk-arcade-footer']) {
    const child=await page.locator(selector).boundingBox();
    expect(child!.y+child!.height).toBeLessThanOrEqual(bounds!.y+bounds!.height+1);
  }
  await page.getByRole('button',{name:'Open terminal',exact:true}).click();
  await expect(page.locator('.desk-computer')).toHaveAttribute('data-app','terminal');
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view','monitor');
});

test('agents finish while the arcade stays open without stealing focus',async({page})=>{
  test.setTimeout(35000);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  await page.getByRole('button',{name:'Yes, keep it'}).click();
  await page.getByRole('button',{name:'Inspect the old game controller',exact:true}).click();
  await page.getByRole('button',{name:'Start run',exact:true}).click();
  await expect(page.locator('.desk-page')).toHaveAttribute('data-api-status','done',{timeout:15000});
  await expect(page.locator('.desk-computer')).toHaveAttribute('data-app','arcade');
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view','monitor');
  await expect(page.getByRole('region',{name:'Runner game',exact:true})).toBeFocused();
  await expect(page.locator('.desk-dialogue')).toHaveCount(0);
});
