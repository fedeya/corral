import {expect,test} from '@playwright/test';

for(const reduced of [false,true]){
  test(`zoom does not inherit the clicked edge hover (${reduced?'reduced':'animated'})`,async({page})=>{
    await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
    await page.goto('/?concept=desk');
    await page.getByRole('button',{name:'Skip intro',exact:true}).click();
    const edge=page.locator('.desk-monitor-frame [data-edge=bottom]');
    await edge.click();
    const surround=page.getByRole('button',{name:'Back to the desk from the monitor surround',exact:true});
    await expect(page.locator('.desk-page')).toHaveAttribute('data-view','monitor');
    if(!reduced) await page.mouse.move(8,180);
    if(!reduced){await page.waitForTimeout(200);await expect(surround.locator('span')).toHaveCSS('opacity','0');}
    await page.waitForTimeout(reduced?100:1900);
    await expect(surround.locator('span')).toHaveCSS('opacity','0');
    await page.mouse.move(10,185);
    await expect(surround.locator('span')).toHaveCSS('opacity','1');
    await page.getByRole('button',{name:'Open browser',exact:true}).click();
    await expect(page.locator('.desk-page')).toHaveAttribute('data-view','monitor');
    await expect(surround.locator('span')).toHaveCSS('opacity','0');
    await page.keyboard.press('Tab');
    await surround.focus();
    await expect(surround.locator('span')).toHaveCSS('opacity','1');
    await page.keyboard.press('Enter');
    await expect(page.locator('.desk-page')).toHaveAttribute('data-view','room');
  });
}
