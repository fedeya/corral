import { expect, test } from '@playwright/test';

test('the device reveals a whole illustrated workstation without forcing interruptions', async ({ page }) => {
  await page.goto('/?concept=desk');
  const desk = page.locator('.desk-page');
  await expect(desk).toHaveAttribute('data-view', 'entry', { timeout: 3000 });
  await page.getByRole('button',{name:'Step inside',exact:true}).click();
  await page.getByRole('button', { name: /^Help agent api —/, exact: true }).click();
  await expect(desk).toHaveAttribute('data-view', 'room');
  const terminal = page.getByRole('region', { name: 'Coding agent demo terminal' });
  await expect(terminal).toContainText('Claude Code');
  await terminal.getByRole('button', { name: 'Yes, keep it' }).click();
  await page.getByRole('button', { name: 'Open browser', exact: true }).click();
  await expect(page.locator('.desk-computer')).toHaveAttribute('data-app', 'browser');
  await expect(page.getByRole('heading', { name: 'Field notes',exact:true })).toBeVisible();
  await expect(page.locator('.desk-page')).toHaveAttribute('data-api-status', 'done', { timeout: 15000 });
  await expect(page.locator('.desk-computer')).toHaveAttribute('data-app', 'browser');
  await expect(page.getByRole('status').filter({ hasText: 'web needs you' })).toContainText('api finished');
  const noticeBox=await page.locator('.desk-room-notice').boundingBox();
  expect(noticeBox!.width).toBeLessThanOrEqual(1);
  expect(noticeBox!.height).toBeLessThanOrEqual(1);
  await expect(page.getByRole('button',{name:/^Desk key web —/,exact:true})).toHaveAttribute('data-status','blocked');
  await page.getByRole('button', { name: 'Push Corral dial 1', exact: true }).click();
  await expect(page.locator('.desk-computer')).toHaveAttribute('data-app', 'terminal');
  await expect(terminal).toContainText('Codex');
});

test('the install guide lives in the monitor browser and is reachable before the demo', async ({ page }) => {
  await page.goto('/?concept=desk');
  await page.getByRole('button', { name: 'Open install guide', exact: true }).click();
  await expect(page.locator('.desk-computer')).toHaveAttribute('data-app', 'browser');
  await expect(page.getByRole('heading', { name: 'Install Corral', exact: true })).toBeVisible();
  await expect(page.locator('.desk-browser')).toContainText('Stream Deck +');
  await expect(page.locator('.desk-browser')).toContainText('bun run build:plugin');
  await expect(page.getByRole('button', { name: 'Copy installation commands' })).toBeVisible();
});

for (const width of [320,390,1440]) {
  test(`the desk stays usable at ${width}px with reduced motion`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?concept=desk');
    await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
    await page.getByRole('button', { name: 'Open install guide', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Install Corral', exact: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('the first decision fits inside the monitor without scrolling', async ({ page }) => {
  await page.setViewportSize({ width:1440, height:1000 });
  await page.emulateMedia({ reducedMotion:'reduce' });
  await page.goto('/?concept=desk');
  await page.getByRole('button', { name:'Skip intro', exact:true }).click();
  await page.evaluate(() => document.fonts.ready);
  const pane = await page.locator('.agent-terminal-session').boundingBox();
  const reply = await page.getByRole('button', { name:'Yes, keep it' }).boundingBox();
  expect(reply!.y + reply!.height).toBeLessThanOrEqual(pane!.y + pane!.height);
});

test('mobile references remain individually tappable instead of overlapping tiny targets', async ({ page }) => {
  await page.setViewportSize({ width:320, height:844 });
  await page.goto('/?concept=desk');
  await page.getByRole('button', { name:'Skip intro', exact:true }).click();
  await page.getByRole('button', { name:'Inspect the source disk', exact:true }).click();
  await expect(page.getByRole('heading', { name:'Small plugin. Open source.', exact:true })).toBeVisible();
});

test('the desk is the only landing and the menu opens its information', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view','entry');
  await expect(page.getByRole('navigation',{name:'Compare landing concepts'})).toHaveCount(0);
  await page.locator('.desk-menu summary').click();
  await page.getByRole('button', { name:'About & credits', exact:true }).click();
  await expect(page.getByRole('heading',{name:'Tools can have a little soul.',exact:true})).toBeVisible();
});
