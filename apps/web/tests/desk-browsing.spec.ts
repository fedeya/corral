import {expect,test} from '@playwright/test';

test('browser switches keep monitor zoom and reading state, with a selectable backdrop exit',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/?concept=desk');
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  await page.locator('.desk-monitor-frame [data-edge=bottom]').click();
  await page.getByRole('button',{name:'Open browser',exact:true}).click();
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view','monitor');
  await page.getByRole('searchbox',{name:'Search field notes'}).fill('gravity');
  await page.getByRole('button',{name:'Read The elevator experiment',exact:true}).click();
  await page.getByRole('button',{name:'Save this note',exact:true}).click();
  await page.getByRole('button',{name:'Open terminal',exact:true}).click();
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view','monitor');
  await page.getByRole('button',{name:'Open browser',exact:true}).click();
  await expect(page.getByRole('searchbox',{name:'Search field notes'})).toHaveValue('gravity');
  await expect(page.getByRole('button',{name:'Unsave this note',exact:true})).toHaveAttribute('aria-pressed','true');
  const background=page.getByRole('button',{name:'Back to the desk from the monitor surround',exact:true});
  await background.hover({position:{x:8,y:180}});
  await expect(background).toHaveCSS('cursor','zoom-out');
  await expect(background.locator('span')).toHaveCSS('opacity','1');
  await background.click({position:{x:8,y:180}});
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view','room');
});

test('notes support keyboard browsing, saving and a clear empty state',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/?concept=desk');
  await page.getByRole('button',{name:'Step inside',exact:true}).click();
  await page.getByRole('button',{name:'Help agent api',exact:true}).click();
  await page.getByRole('button',{name:'Open browser',exact:true}).click();
  const first=page.getByRole('button',{name:'Read Falling sideways',exact:true});
  await first.focus();await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('button',{name:'Read The elevator experiment',exact:true})).toBeFocused();
  await page.getByRole('searchbox',{name:'Search field notes'}).fill('not-a-note');
  await expect(page.getByText('No notes in this corner of the universe.')).toBeVisible();
  await page.getByRole('button',{name:'Clear search',exact:true}).click();
  await expect(first).toBeVisible();
});
