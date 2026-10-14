import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

for (const width of [1440, 390, 320]) {
  test(`keyboard app selection, inert camera, target sizes and focus evidence (${width})`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 }); await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/');
    await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
    await page.getByRole('button', { name: 'Zoom in on the Stream Deck', exact: true }).focus(); await page.keyboard.press('Enter');
    await page.keyboard.press('Tab'); await expect(page.locator('.desk-key').nth(1)).toBeFocused();
    if (width <= 760) {
      for (const key of await page.locator('.desk-key').all()) { const box = (await key.boundingBox())!; expect(box.width).toBeGreaterThanOrEqual(43.9); expect(box.height).toBeGreaterThanOrEqual(43.9); }
    }
    await page.screenshot({ path: join(tmpdir(), `corral-focus-${testInfo.project.name}-${width}-device.png`) });
    await page.keyboard.press('Enter');
    if (width > 760) { await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Zoom in using the monitor frame' }).focus(); await page.keyboard.press('Enter'); }
    const browser = page.getByRole('button', { name: 'Open browser', exact: true });
    await browser.focus(); await page.keyboard.press('Enter'); await expect(page.locator('.desk-computer')).toBeFocused();
    const search = page.getByRole('searchbox', { name: 'Search field notes' }); await search.focus(); await search.fill('gravity');
    for (let i = 0; i < 18; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => { const active = document.activeElement!; const r = active.getBoundingClientRect(); return !!active.closest('[inert],[hidden],.desk-device,.desk-objects') || r.bottom < 0 || r.top > innerHeight; })).toBe(false);
    }
    await search.focus();
    await expect(search).toHaveCSS('outline-color', 'rgb(88, 69, 44)');
    await page.screenshot({ path: join(tmpdir(), `corral-focus-${testInfo.project.name}-${width}-browser.png`) });
    await page.keyboard.press('Escape'); await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'room');
    if (width <= 760) await expect(page.getByRole('button', { name: 'Focus monitor ↗', exact: true })).toBeFocused();
  });
}

test('background completion does not steal app, input or focus', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/');
  await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
  await page.locator('.desk-monitor-frame').focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Yes, keep it', exact: true }).click(); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Open browser', exact: true }).click();
  const search = page.getByRole('searchbox', { name: 'Search field notes' }); await search.fill('gravity');
  await expect(page.locator('.desk-page')).toHaveAttribute('data-api-status', 'done', { timeout: 18000 });
  await expect(search).toBeFocused(); await expect(search).toHaveValue('gravity');
  await expect(page.locator('.desk-computer')).toHaveAttribute('data-app', 'browser');
});

for (const width of [1440, 390, 320]) {
  test(`automated semantics and contrast audit (${width})`, async ({ page }) => {
    test.setTimeout(60000); // Five full axe passes can exceed 30s in native WebKit.
    await page.setViewportSize({ width, height: 900 }); await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const audit = async () => {
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(results.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(node => ({ target: node.target, summary: node.failureSummary })) }))).toEqual([]);
    };
    await audit();
    await page.getByRole('button', { name: 'Skip intro', exact: true }).click(); await audit();
    await page.getByRole('button', { name: 'Zoom in on the Stream Deck', exact: true }).click(); await audit();
    await page.locator('.desk-key').first().press('Enter');
    if (width > 760) { await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Zoom in using the monitor frame' }).focus(); await page.keyboard.press('Enter'); }
    await audit();
    await page.getByRole('button', { name: 'Open browser', exact: true }).click(); await audit();
  });
}

test('dialogue has one persistent full-line announcement independent of typewriter and focus', async ({ page }) => {
  await page.goto('/');
  const announcement = page.locator('.desk-dialogue-message');
  await expect(announcement).toHaveCount(1);
  await expect(announcement).toBeEmpty();
  await page.getByRole('button', { name: 'Mute desk sound' }).click();
  await page.getByRole('button', { name: 'Step inside', exact: true }).click();
  await expect(page.locator('.desk-key').first()).toBeFocused();
  await expect(announcement).toHaveText('Psst… I’m adding keyboard shortcuts. Need your call on one thing. Tap my little !');
  await expect(page.locator('.desk-dialogue-typed')).toHaveAttribute('data-typing', 'true');
  await expect(page.locator('.desk-dialogue [role=status]')).toHaveCount(0);
  await page.keyboard.press('Space'); await expect(page.locator('.desk-key').first()).toBeFocused();
});

test('reduced motion disables zoom-surround fades too', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/');
  await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
  await page.getByRole('button', { name: 'Zoom in using the monitor frame' }).focus(); await page.keyboard.press('Enter');
  expect(await page.locator('.desk-monitor-surround span').evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s');
});

test('reduced motion leaves static artwork and no CSS motion across room and monitor', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/');
  await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
  for (const name of ['Switch the desk lamp', 'Wake the Zac prototype']) {
    await page.getByRole('button', { name, exact: true }).click();
    await page.keyboard.press('Escape');
  }
  expect(await page.locator('.desk-art').evaluate(element => getComputedStyle(element.querySelector('.desk-art-storm')!).transitionDuration)).toBe('0s');
  expect(await page.locator('.desk-monitor-surround').count()).toBe(0);
  await page.getByRole('button', { name: 'Focus illustrated monitor' }).click();
  expect(await page.locator('.desk-page').evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0);
  expect(await page.locator('.desk-page').evaluate(element => [...element.querySelectorAll('*')].filter(child => getComputedStyle(child).transitionDuration.split(',').some(value => parseFloat(value) > 0)).map(child => child.className))).toEqual([]);
  await expect(page.locator('.agent-terminal-session')).not.toHaveAttribute('aria-live', 'polite');
});

test('keys expose agent, status and action without relying on color', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/');
  await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
  await page.getByRole('button', { name: 'Zoom in on the Stream Deck', exact: true }).click();
  for (const key of await page.locator('.desk-key').all()) {
    const status = await key.getAttribute('data-status');
    await expect(key).toHaveAccessibleName(new RegExp(`Desk key .+ — ${status}; open .+ agent`));
    await expect(key.locator('.desk-key-status')).toHaveText(status!);
  }
});

for (const width of [1440, 390, 320]) {
  test(`intentional zoom moves focus and Escape restores the visible initiator (${width})`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
    const origin = width > 760 ? page.getByRole('button', { name: 'Zoom in using the monitor frame' }) : page.getByRole('button', { name: 'Focus illustrated monitor' });
    await origin.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('region', { name: 'Desk monitor', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(origin).toBeFocused();
    const device = page.getByRole('button', { name: 'Zoom in on the Stream Deck', exact: true });
    await device.focus(); await page.keyboard.press('Enter');
    await expect(page.locator('.desk-key').first()).toBeFocused();
    await page.keyboard.press('Escape'); await expect(device).toBeFocused();
  });
}
