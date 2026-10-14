import {expect,test} from '@playwright/test';

test('Space completes then dismisses dialogue without reactivating the focused prop',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  const duck=page.getByRole('button',{name:'Ask the rubber duck',exact:true});
  await duck.click();
  await expect(page.locator('.desk-dialogue-typed')).toHaveAttribute('data-typing','true');
  await page.keyboard.press('Space');
  await expect(page.locator('.desk-dialogue-typed')).toHaveAttribute('data-typing','false');
  await expect(page.locator('.desk-dialogue-typed')).toContainText('expected');
  await expect(duck).toHaveCSS('outline-style','none');
  await expect(page.locator('.desk-dialogue')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('.desk-dialogue')).toHaveCount(0);
  await expect(duck).not.toBeFocused();
  await expect(duck).toHaveCSS('outline-style','none');
});

test('keyboard-opened dialogue returns visible focus to its prop after Space dismissal',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  const duck=page.getByRole('button',{name:'Ask the rubber duck',exact:true});
  await duck.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(duck).toBeFocused();
  await expect(duck).toHaveCSS('outline-style','solid');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await expect(page.locator('.desk-dialogue-typed')).toHaveAttribute('data-typing','false');
  await expect(page.locator('.desk-dialogue')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('.desk-dialogue')).toHaveCount(0);
  await expect(duck).toBeFocused();
  await expect(duck).toHaveCSS('outline-style','solid');
});

test('Space stays an ordinary character inside field notes while a dialogue is open',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  await page.getByRole('button',{name:'Open browser',exact:true}).click();
  await page.getByRole('button',{name:'Ask the rubber duck',exact:true}).click();
  const input=page.getByRole('searchbox',{name:'Search field notes'});
  await input.fill('gravity');
  await input.press('Space');
  await expect(input).toHaveValue('gravity ');
  await expect(page.locator('.desk-dialogue')).toHaveCount(1);
});

test('Space on the dialogue button advances only once with native keyboard activation',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  await page.getByRole('button',{name:'Ask the rubber duck',exact:true}).click();
  await page.getByRole('button',{name:'Complete dialogue',exact:true}).focus();
  await page.keyboard.press('Space');
  await expect(page.locator('.desk-dialogue-typed')).toHaveAttribute('data-typing','false');
  await expect(page.locator('.desk-dialogue')).toHaveCount(1);
  await page.keyboard.press('Space');
  await expect(page.locator('.desk-dialogue')).toHaveCount(0);
});
