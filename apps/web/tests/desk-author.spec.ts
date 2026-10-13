import {expect,test} from '@playwright/test';

for(const width of [1440,390]) test(`Fefe has a menu link and signed book note at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await page.getByLabel('Desk menu',{exact:true}).click();
  const author=page.getByRole('link',{name:'Made by Fefe ↗',exact:true});
  await expect(author).toHaveAttribute('href','https://fedeminaya.com');
  await expect(author).toHaveAttribute('target','_blank');
  await page.getByLabel('Desk menu',{exact:true}).click();
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  await page.getByRole('button',{name:'Read the desk books',exact:true}).click();
  await expect(page.locator('.desk-author-note')).toContainText('I made this desk around the things I like: coding, physics, space, and figuring out how things work.');
  await expect(page.locator('.desk-author-note')).toContainText('Fefe');
});

test('the night window stays uncluttered without losing its visitor and star keepsake',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  await expect(page.locator('.desk-art-home-label')).toHaveCount(0);
  await expect(page.locator('.desk-art-book-signature')).toContainText('Fefe');
  const window=page.getByRole('button',{name:'Look through the window',exact:true});
  await window.click();
  await expect(page.locator('.desk-dialogue')).toContainText('Different city. Same sky.');
  await expect(page.locator('.desk-dialogue')).not.toContainText('Necochea');
  await expect(page.locator('.desk-art-visitor')).toHaveAttribute('data-visible','true');
  await window.click();
  await expect(page.locator('.desk-art-window-gift')).toBeVisible();
});
