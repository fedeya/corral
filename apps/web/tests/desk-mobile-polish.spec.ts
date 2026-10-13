import { expect, test } from '@playwright/test';

for (const width of [320, 390]) test(`mobile navigation is one accessible row at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 844 });
  await page.goto('/?concept=desk');
  await page.screenshot({ path: testInfo.outputPath(`header-${width}.png`) });
  const boxes = await page.locator('.desk-brand, .desk-header nav > button, .desk-menu summary').evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right };
  }));
  expect(Math.max(...boxes.map(box => box.y)) - Math.min(...boxes.map(box => box.y))).toBeLessThanOrEqual(2);
  for (const box of boxes) { expect(box.height).toBeGreaterThanOrEqual(44); expect(box.width).toBeGreaterThanOrEqual(44); expect(box.x).toBeGreaterThanOrEqual(0); expect(box.right).toBeLessThanOrEqual(width); }
  await expect(page.getByRole('button', { name: 'Skip intro', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open install guide', exact: true })).toBeVisible();
});

for (const width of [390, 1440]) test(`entry camera moves before dialogue at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?concept=desk');
  await page.getByRole('button', { name: 'Mute desk sound', exact: true }).click();
  await page.waitForTimeout(1600);
  const transform = () => page.locator('.desk-scene').evaluate(element => getComputedStyle(element).transform);
  const before = await transform();
  await page.evaluate(() => {
    const root = document.querySelector('.desk-page')!;
    const native = window.setTimeout.bind(window);
    // Record the camera-derived speech timer independently of slow render frames.
    window.setTimeout = ((handler: TimerHandler, delay?: number, ...args: unknown[]) => {
      if (root.getAttribute('data-view') === 'closeup' && delay && delay >= 800 && delay <= 1600)
        root.setAttribute('data-entry-timer', String(delay));
      return native(handler, delay, ...args);
    }) as typeof window.setTimeout;
  });
  await page.getByRole('button', { name: 'Step inside', exact: true }).click();
  // Observe timing inside the browser; slow WebKit protocol frames must not
  // turn an intentionally shorter speech offset into a false failure.
  await expect.poll(transform, { timeout: 1000, intervals: [40] }).not.toBe(before);
  await page.screenshot({ path: testInfo.outputPath(`entry-mid-${width}.png`) });
  await expect(page.locator('.desk-dialogue')).toBeVisible();
  const delay = Number(await page.locator('.desk-page').getAttribute('data-entry-timer'));
  expect(delay).toBeGreaterThanOrEqual(800);
  expect(delay).toBeLessThan(1150);
  await page.waitForTimeout(700);
  await page.screenshot({ path: testInfo.outputPath(`entry-end-${width}.png`) });
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'closeup');
});

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1440, height: 844 }]) test(`floating dialogue leaves camera stable at ${viewport.width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize(viewport);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?concept=desk');
  await page.getByRole('button', { name: 'Mute desk sound', exact: true }).click();
  await page.getByRole('button', { name: 'Step inside', exact: true }).click();
  await expect(page.locator('.desk-dialogue')).toBeVisible();
  const geometry = () => page.locator('.desk-viewport').evaluate(element => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, transform: getComputedStyle(document.querySelector('.desk-scene')!).transform };
  });
  const speaking = await geometry();
  const dialogue = await page.locator('.desk-dialogue').boundingBox();
  expect(dialogue!.y + dialogue!.height).toBe(viewport.height - (viewport.width <= 760 ? 10 : 14));
  for (const key of await page.locator('.desk-key').all()) {
    const box = await key.boundingBox();
    if (box && box.width > 0) expect(box.y + box.height).toBeLessThanOrEqual(dialogue!.y);
  }
  await page.screenshot({ path: testInfo.outputPath(`floating-${viewport.width}.png`) });
  await page.getByRole('button', { name: 'Close dialogue', exact: true }).click();
  await page.waitForTimeout(100);
  expect(await geometry()).toEqual(speaking);
  expect(speaking.height).toBe(viewport.height - speaking.y);
});

test('reduced-motion replay restarts dialogue immediately even in closeup', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?concept=desk');
  await page.getByRole('button', { name: 'Mute desk sound', exact: true }).click();
  await page.getByRole('button', { name: 'Step inside', exact: true }).click();
  await expect(page.locator('.desk-dialogue')).toBeVisible();
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  await expect(page.locator('.desk-dialogue-typed')).toContainText('Psst', { timeout: 500 });
  await expect(page.locator('.desk-dialogue-typed')).toHaveAttribute('data-typing', 'false');
});

for (const action of ['Skip intro', 'Open install guide', 'Replay']) test(`${action} cancels pending entry dialogue`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?concept=desk');
  await page.getByRole('button', { name: 'Mute desk sound', exact: true }).click();
  await page.getByRole('button', { name: 'Step inside', exact: true }).click();
  await page.getByRole('button', { name: action, exact: true }).click();
  await page.waitForTimeout(1800);
  if (action === 'Replay') { await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'closeup'); await expect(page.locator('.desk-dialogue')).toBeVisible(); }
  else await expect(page.locator('.desk-dialogue')).toHaveCount(0);
});
