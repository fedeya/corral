import {expect,test} from '@playwright/test';

test('the rubber duck walks through a debugging conversation and remembers across monitor visits',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  const duck=page.getByRole('button',{name:'Ask the rubber duck',exact:true});
  await duck.click();
  await expect(page.locator('.desk-dialogue')).toContainText('expected');
  await page.getByRole('button',{name:'Close dialogue',exact:true}).click();
  await duck.click();
  await expect(page.locator('.desk-dialogue')).toContainText('smallest thing you can test');
  await page.locator('.desk-monitor-frame [data-edge=bottom]').click();
  await page.getByRole('button',{name:'Back to the desk from the monitor surround'}).click({position:{x:8,y:180}});
  await duck.click();
  await expect(page.locator('.desk-dialogue')).toContainText('You already know what to try');
});

test('the night visitor leaves a star on the glass after a second visit',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  const window=page.getByRole('button',{name:'Look through the window',exact:true});
  await window.click();
  await expect(page.locator('.desk-art-visitor')).toHaveAttribute('data-visible','true');
  await window.click();
  await expect(page.locator('.desk-art-visitor')).toHaveAttribute('data-visible','false');
  await expect(page.locator('.desk-art-window-gift')).toBeVisible();
  await expect(page.locator('.desk-dialogue')).toContainText('star');
  await window.click();
  await expect(page.locator('.desk-art-window-gift')).toBeVisible();
  await expect(page.locator('.desk-dialogue')).toContainText('back');
});

test('the first finished task celebrates once without stealing the camera or opening dialogue',async({page})=>{
  test.setTimeout(35000);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  await page.getByRole('button',{name:'Yes, keep it'}).click();
  await page.getByRole('button',{name:'Open browser',exact:true}).click();
  await expect(page.locator('.desk-page')).toHaveAttribute('data-api-status','done',{timeout:15000});
  await expect(page.locator('.desk-key').first()).toHaveAttribute('data-celebrating','true');
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view','room');
  await expect(page.locator('.desk-computer')).toHaveAttribute('data-app','browser');
  await expect(page.locator('.desk-dialogue')).toHaveCount(0);
  await expect(page.locator('.desk-key').first()).toHaveAttribute('data-celebrating','false',{timeout:4000});
  await page.getByRole('button',{name:'Replay',exact:true}).click();
  await expect(page.locator('.desk-key').first()).toHaveAttribute('data-celebrating','false');
});
