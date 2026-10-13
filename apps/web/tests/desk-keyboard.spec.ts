import {expect,test} from '@playwright/test';

test('the keyboard splits and evolves without a lingering hover label',async({page})=>{
  await page.goto('/?concept=desk');
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  await expect(page.locator('.desk-art .desk-keyboard')).toHaveAttribute('data-evolved','false');
  const key=page.getByRole('button',{name:'Evolve the keyboard',exact:true});
  await key.click();
  await expect(page.locator('.desk-art .desk-keyboard')).toHaveAttribute('data-evolved','true');
  await expect(page.locator('.desk-dialogue')).toContainText('Now you have a real keyboard.');
  await expect(page.locator('.desk-art .desk-keyboard-split')).toHaveCSS('opacity','1');
  await expect(page.locator('.desk-art .desk-keyboard-flat-left')).toHaveCSS('opacity','0');
  await expect(key.locator('.desk-object-label')).not.toBeVisible();
  await page.getByRole('button',{name:'Close dialogue',exact:true}).click();
  await key.click();
  await expect(page.locator('.desk-art .desk-keyboard')).toHaveAttribute('data-evolved','false');
});

test('the split keyboard animates its halves back together only after evolving',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  const left=page.locator('.desk-art .desk-keyboard-flat-left');
  await expect(left).toHaveCSS('animation-name','none');
  const key=page.getByRole('button',{name:'Evolve the keyboard',exact:true});
  await key.click();
  await expect(page.locator('.desk-art .desk-keyboard-split')).toHaveCSS('opacity','1');
  await page.getByRole('button',{name:'Close dialogue',exact:true}).click();
  await key.click();
  await expect(left).toHaveCSS('animation-name','desk-keyboard-join-left');
  await expect(page.locator('.desk-art .desk-keyboard-flat-right')).toHaveCSS('animation-name','desk-keyboard-join-right');
  await expect(left).toHaveCSS('opacity','1');
  await expect(page.locator('.desk-art .desk-keyboard-split')).toHaveCSS('opacity','0');
});

test('keyboard evolution is keyboard accessible and respects reduced motion',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/?concept=desk');
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  await page.getByRole('button',{name:'Evolve the keyboard',exact:true}).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.desk-art .desk-keyboard-split')).toHaveCSS('animation-name','none');
  await expect(page.locator('.desk-art .desk-keyboard')).toHaveAttribute('data-evolved','true');
});

test('the arcade stick buttons have clearance from the lower shell edge',async({page})=>{
  await page.goto('/?concept=desk');
  const gap=await page.evaluate(()=>{
    const stick=document.querySelector<SVGGraphicsElement>('[data-prop-art="controller"]')!.getBBox();
    const buttons=Array.from(document.querySelectorAll<SVGGraphicsElement>('[data-prop-art="controller"] [data-arcade-button]'));
    return stick.y+stick.height-Math.max(...buttons.map(button=>{const box=button.getBBox();return box.y+box.height;}));
  });
  expect(gap).toBeGreaterThanOrEqual(6);
});
