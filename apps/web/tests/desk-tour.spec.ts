import {expect,test} from '@playwright/test';

test('the desk guides an uninterrupted preview-to-attention-to-agent loop',async({page})=>{
  test.setTimeout(45000);
  await page.goto('/?concept=desk');
  await page.getByRole('button',{name:'Step inside',exact:true}).click();
  await page.getByRole('button',{name:/^Help agent api —/,exact:true}).click();
  await page.locator('.desk-monitor-frame [data-edge=bottom]').click();
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view','monitor');
  await page.getByRole('button',{name:'Yes, keep it'}).click();
  await expect(page.locator('.desk-dialogue')).toContainText('Go read something in the browser.');
  await expect(page.getByRole('button',{name:'Open browser',exact:true})).toHaveAttribute('data-invited','true');
  await page.getByRole('button',{name:'Open browser',exact:true}).click();
  await page.getByRole('searchbox',{name:'Search field notes'}).fill('gravity');
  await page.waitForTimeout(3600);
  await expect(page.locator('.desk-page')).toHaveAttribute('data-api-status','working');
  await expect(page.locator('.desk-computer')).toHaveAttribute('data-app','browser');
  const camera=await page.locator('.desk-page').getAttribute('data-view');
  await expect(page.locator('.desk-page')).toHaveAttribute('data-api-status','done',{timeout:15000});
  await expect(page.locator('.desk-computer')).toHaveAttribute('data-app','browser');
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view',camera!);
  await expect(page.getByRole('searchbox',{name:'Search field notes'})).toHaveValue('gravity');
  await page.getByRole('button',{name:'Back to the desk from the monitor surround'}).click({position:{x:8,y:180}});
  await page.getByRole('button',{name:/^Desk key web —/,exact:true}).click();
  await expect(page.getByRole('region',{name:'Coding agent demo terminal'})).toHaveAttribute('data-focused','web');
  await page.getByRole('button',{name:'Yes, keep it'}).click();
  await expect(page.locator('.desk-dialogue')).toContainText('Your agents work. You stay in your flow.');
  await expect(page.locator('.desk-page')).toHaveAttribute('data-tour','free');
});

test('replay cancels the slower desk run and keeps the original concepts selectable',async({page})=>{
  await page.goto('/?concept=desk');
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  await page.getByRole('button',{name:'Yes, keep it'}).click();
  await page.getByRole('button',{name:'Replay',exact:true}).click();
  await expect(page.locator('.desk-page')).toHaveAttribute('data-tour','first-help');
  await expect(page.locator('.desk-page')).toHaveAttribute('data-api-status','blocked');
});
