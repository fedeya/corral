import { expect, test } from '@playwright/test';
test.use({ hasTouch: true });

for (const reducedMotion of ['no-preference', 'reduce'] as const) test(`mobile key focuses and reveals a readable monitor (${reducedMotion})`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion });
  await page.goto('/?concept=desk');
  await page.getByRole('button', { name: 'Mute desk sound', exact: true }).click();
  await page.getByRole('button', { name: 'Step inside', exact: true }).click();
  await expect(page.locator('.desk-dialogue')).toBeVisible();
  await page.waitForTimeout(reducedMotion === 'reduce' ? 0 : 700);
  const scene = page.locator('.desk-scene');
  const before = await scene.evaluate(element => getComputedStyle(element).transform);
  await page.getByRole('button', { name: 'Help agent api', exact: true }).tap();
  const panel = page.getByRole('region', { name: 'Readable mobile monitor' });
  await expect(panel).toBeVisible();
  const appearance = () => panel.evaluate(element => ({ opacity: Number(getComputedStyle(element).opacity), transform: getComputedStyle(element).transform, animations: element.getAnimations().filter(animation => animation.playState === 'running').length }));
  if (reducedMotion === 'no-preference') {
    expect((await appearance()).animations).toBeGreaterThan(0);
    // Seek actual CSS timelines: slow WebKit transport can outlast the move.
    await page.evaluate(async () => {
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      for (const selector of ['.desk-mobile-workspace', '.desk-scene'])
        for (const animation of document.querySelector(selector)!.getAnimations()) {
          animation.pause(); animation.currentTime = 200;
        }
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    });
    const mid = await appearance();
    expect(mid.opacity).toBeGreaterThan(0);
    expect(mid.opacity).toBeLessThan(1);
    await expect(scene).toBeVisible();
    expect(await scene.evaluate(element => getComputedStyle(element).transform)).not.toBe(before);
    await page.screenshot({ path: testInfo.outputPath('monitor-mid.png') });
    await page.evaluate(() => {
      for (const selector of ['.desk-mobile-workspace', '.desk-scene'])
        for (const animation of document.querySelector(selector)!.getAnimations()) animation.play();
    });
    await expect.poll(async () => (await appearance()).opacity).toBe(1);
  } else {
    expect(await appearance()).toEqual({ opacity: 1, transform: 'none', animations: 0 });
  }
  await expect(page.getByRole('button', { name: 'Yes, keep it', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('monitor-end.png') });
  const box = await panel.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  await page.getByRole('button', { name: 'Back to the desk ↙', exact: true }).tap();
  await expect(panel).toHaveCount(0);
  await page.getByRole('button', { name: 'Replay', exact: true }).tap();
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'closeup');
  await expect(panel).toHaveCount(0);
});
