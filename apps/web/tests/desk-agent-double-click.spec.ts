import { expect, test } from '@playwright/test';

 test('desktop mouse double-click selects the agent and returns quietly to its terminal in the room', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?concept=desk');
  await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
  await page.getByRole('button', { name: 'Zoom in on the Stream Deck', exact: true }).click();
  await page.getByRole('button', { name: 'Desk key web', exact: true }).dblclick();
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'room');
  await expect(page.getByRole('button', { name: 'Desk key web', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.desk-computer')).toHaveAttribute('data-app', 'terminal');
  await expect(page.locator('.reveal-coding-terminal')).toHaveAttribute('data-focused', 'web');
  await expect(page.locator('.agent-terminal-session')).toHaveAttribute('aria-label', 'web terminal session');
  await expect(page.locator('.desk-page')).toHaveAttribute('data-talk', 'false');
  await page.screenshot({ path: testInfo.outputPath('desktop-double-click-room.png') });
 });

 test('desktop single-click and keyboard activation keep the device camera', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
  await page.getByRole('button', { name: 'Zoom in on the Stream Deck', exact: true }).click();
  const web = page.getByRole('button', { name: 'Desk key web', exact: true });
  await web.click();
  await expect(web).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'device');
  const api = page.getByRole('button', { name: 'Desk key api', exact: true });
  await api.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await expect(api).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'device');
 });

 for (const width of [390, 760, 1440]) {
  test(`trusted touch retains ordinary selection, even with a compatibility double-click (${width}px)`, async ({ browser }, testInfo) => {
   const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: true, reducedMotion: 'reduce', baseURL: 'http://127.0.0.1:4186' });
   const page = await context.newPage();
   await page.goto('/');
   await page.getByRole('button', { name: 'Mute desk sound', exact: true }).tap();
   await page.getByRole('button', { name: 'Skip intro', exact: true }).tap();
   await page.getByRole('button', { name: 'Zoom in on the Stream Deck', exact: true }).tap();
   const api = page.getByRole('button', { name: 'Desk key api', exact: true });
   const element = await api.elementHandle();
   await api.tap();
   // A second touch compatibility event must never trigger the mouse shortcut.
   await element!.evaluate(node => node.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, detail: 2 })));
   await expect(page.locator('.desk-page')).toHaveAttribute('data-view', width <= 760 ? 'monitor' : 'device');
   if (width <= 760) {
    await expect(page.getByRole('combobox', { name: 'Focused agent', exact: true })).toHaveValue('0');
    await expect(page.getByRole('button', { name: 'Yes, keep it', exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`touch-${width}-monitor.png`) });
   } else {
    await expect(api).toHaveAttribute('aria-pressed', 'true');
   }
   await context.close();
  });
 }

 test('initial closeup preserves its existing single-click intro handoff', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Step inside', exact: true }).click();
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'closeup');
  await expect(page.locator('.desk-dialogue')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Help agent api', exact: true }).click();
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'room');
  await expect(page.locator('.reveal-coding-terminal')).toHaveAttribute('data-focused', 'api');
  await expect(page.locator('.desk-dialogue')).toContainText('There I am');
 });
