import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function room(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
}

for (const width of [1440, 390]) {
  test(`Escape exits monitor and device without toggling room (${width}px)`, async ({ page }) => {
    await room(page, width);
    await page.getByRole('button', { name: 'Zoom in on the Stream Deck', exact: true }).click();
    await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'device');
    await page.keyboard.press('Escape');
    await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'room');
    if (width === 390) await page.getByRole('button', { name: 'Focus illustrated monitor' }).click();
    else await page.locator('.desk-monitor-frame [data-edge=bottom]').click();
    await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'monitor');
    await page.keyboard.press('Escape');
    await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'room');
  });

  test(`Escape dismisses monitor dialogue before exiting (${width}px)`, async ({ page }) => {
    await room(page, width);
    if (width === 390) await page.getByRole('button', { name: 'Focus illustrated monitor' }).click();
    else await page.locator('.desk-monitor-frame [data-edge=bottom]').click();
    await page.getByRole('button', { name: 'Yes, keep it', exact: true }).click();
    await expect(page.locator('.desk-dialogue')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(page.locator('.desk-dialogue')).toHaveCount(0);
    await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'monitor');
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', repeat: true, cancelable: true })));
    await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'monitor');
    await page.keyboard.press('Escape');
    await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'room');
  });

  test(`Escape leaves arcade ownership intact then exits camera (${width}px)`, async ({ page }) => {
    await room(page, width);
    await page.getByRole('button', { name: 'Inspect the old game controller', exact: true }).click();
    await page.getByRole('region', { name: 'Runner game', exact: true }).focus();
    await page.keyboard.press('Space');
    await expect(page.locator('.desk-arcade-game')).toHaveAttribute('data-state', 'running');
    await page.keyboard.press('Escape');
    await expect(page.locator('.desk-computer')).toHaveAttribute('data-app', 'terminal');
    await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'monitor');
    // WebKit settles focus after the focused arcade node is removed on paint.
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.keyboard.press('Escape');
    await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'room');
  });

  test(`Escape closes open desk menu before camera (${width}px)`, async ({ page }) => {
    await room(page, width);
    await page.getByRole('button', { name: 'Zoom in on the Stream Deck', exact: true }).click();
    await page.getByLabel('Desk menu', { exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(page.locator('.desk-menu')).not.toHaveAttribute('open', '');
    await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'device');
    await page.keyboard.press('Escape');
    await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'room');
  });
}

test('Escape defers to focused native select, but inputs can cancel the camera', async ({ page }) => {
  await room(page, 390);
  await page.getByRole('button', { name: 'Focus illustrated monitor' }).click();
  const select = page.getByRole('combobox', { name: 'Focused agent' });
  await select.focus();
  await select.press('ArrowDown');
  await select.press('Escape');
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'monitor');
  await page.getByRole('button', { name: 'Open browser', exact: true }).click();
  const input = page.getByRole('searchbox', { name: 'Search field notes' });
  await input.fill('gravity');
  await input.press('Escape');
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'room');
});

test('Escape dismisses narration while an editable field owns focus', async ({ page }) => {
  await room(page, 1440);
  await page.getByRole('button', { name: 'Open browser', exact: true }).click();
  await page.getByRole('button', { name: 'Ask the rubber duck', exact: true }).click();
  const input = page.getByRole('searchbox', { name: 'Search field notes' });
  await input.fill('gravity');
  await input.press('Escape');
  await expect(input).toHaveValue('gravity');
  await expect(page.locator('.desk-dialogue')).toHaveCount(0);
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'room');
});

test('Escape cancels a pending opening narration when leaving closeup', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Mute desk sound' }).click();
  await page.getByRole('button', { name: 'Step inside', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'room');
  await page.waitForTimeout(1200); // Beyond the bounded opening lead-in.
  await expect(page.locator('.desk-dialogue')).toHaveCount(0);
});

test('Escape ignores repeats, modifiers, composition and consumed local events', async ({ page }) => {
  await room(page, 1440);
  await page.getByRole('button', { name: 'Zoom in on the Stream Deck', exact: true }).click();
  for (const modifiers of [{ repeat: true }, { altKey: true }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { isComposing: true }]) {
    await page.evaluate(init => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, ...init })), modifiers);
    await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'device');
  }
  await page.evaluate(() => {
    const control = document.querySelector('.desk-replay')!;
    control.addEventListener('keydown', event => event.preventDefault(), { once: true });
    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  });
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'device');
  await page.keyboard.press('Escape');
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'room');
});

test('desk keyboard listener is removed on unmount', async ({ page }) => {
  await page.goto('/');
  const counts = await page.evaluate(async () => {
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const listeners = new Set<EventListenerOrEventListenerObject>();
    const add = window.addEventListener;
    const remove = window.removeEventListener;
    window.addEventListener = new Proxy(add, { apply(fn, receiver, args) {
      if (args[0] === 'keydown' && args[1].name === 'keydown') listeners.add(args[1]);
      return Reflect.apply(fn, receiver, args);
    } });
    window.removeEventListener = new Proxy(remove, { apply(fn, receiver, args) {
      if (args[0] === 'keydown' && args[1].name === 'keydown') listeners.delete(args[1]);
      return Reflect.apply(fn, receiver, args);
    } });
    const reactUrl = '/node_modules/.vite/deps/react.js';
    const rootUrl = '/node_modules/.vite/deps/react-dom_client.js';
    const deskUrl = '/src/desk/Desk.tsx';
    const [{ default: { createElement } }, { default: { createRoot } }, { Desk }] = await Promise.all([import(reactUrl), import(rootUrl), import(deskUrl)]);
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;inset:0';
    document.body.append(host);
    const root = createRoot(host);
    root.render(createElement(Desk));
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const mounted = listeners.size;
    root.unmount();
    const unmounted = listeners.size;
    host.remove();
    window.addEventListener = add;
    window.removeEventListener = remove;
    return { mounted, unmounted };
  });
  expect(counts).toEqual({ mounted: 1, unmounted: 0 });
});

test('Escape does not skip the entry overlay', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Escape');
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'entry');
});

for (const width of [1440, 390]) {
  test(`Escape dismisses typing narration before leaving initial closeup (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Mute desk sound' }).click();
    await page.getByRole('button', { name: 'Step inside', exact: true }).click();
    await expect(page.locator('.desk-dialogue-typed')).toHaveAttribute('data-typing', 'true');
    await page.keyboard.press('Escape');
    await expect(page.locator('.desk-dialogue')).toHaveCount(0);
    await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'closeup');
    await page.keyboard.press('Escape');
    await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'room');
    await page.keyboard.press('Escape');
    await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'room');
  });
}
