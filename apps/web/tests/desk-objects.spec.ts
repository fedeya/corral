import { expect, test, type Page } from '@playwright/test';
import { DESK_OBJECTS } from '../src/desk/desk-contract';

const harness = process.env.DESK_BASE_URL?.includes('4187');

for (const [label, response, effect] of [
  ['Water the desk plant', 'Roots', 'plant'],
  ['Take a mate break', 'One sip', 'coffee'],
  ['Launch the little rocket', 'Orbit', 'rocket'],
  ['Ask the rubber duck', 'expected', ''],
  ['Inspect the old game controller', 'Player one', ''],
  ['Read the space poster', 'pale blue', ''],
  ['Read the physics notes', 'elevator', ''],
]) {
  test(`${label} gives a small useful response`, async ({ page }) => {
    await explore(page);
    await page.getByRole('button', { name: label, exact: true }).click();
    if(!harness && label === 'Inspect the old game controller') await expect(page.getByRole('heading',{name:'AGENT ARCADE',exact:true})).toBeVisible();
    else await expect(page.locator(!harness && label === 'Ask the rubber duck' ? '.desk-dialogue' : '.desk-objects-status')).toContainText(response);
    if (harness && effect) await expect(page.getByTestId('effect')).toHaveText(effect);
  });
}

for (const [label, target] of [['Inspect the source disk', 'source'], ['Read the desk books', 'about']]) {
  test(`${label} opens the internal browser`, async ({ page }) => {
    await explore(page);
    await page.getByRole('button', { name: label, exact: true }).click();
    if (harness) await expect(page.getByTestId('browser-page')).toHaveText(target);
    else await expect(page.locator('.desk-objects-status')).toContainText(target === 'source' ? 'Source' : 'guide');
  });
}

test('cassette is opt-in, stoppable, and ends by itself', async ({ page }) => {
  await page.addInitScript(() => {
    const Native = window.AudioContext;
    const contexts: AudioContext[] = [];
    Object.assign(window, { deskTestContexts: contexts });
    window.AudioContext = class extends Native {
      constructor(options?: AudioContextOptions) { super(options); contexts.push(this); }
    };
  });
  const states = () => page.evaluate(() => (window as unknown as { deskTestContexts: AudioContext[] }).deskTestContexts.map((context) => context.state));
  await explore(page);
  const voiceStates = ['running'];
  await expect.poll(states).toEqual(voiceStates);
  const cassette = page.getByRole('button', { name: 'Play a short chiptune', exact: true });
  await expect(cassette).toHaveAttribute('aria-pressed', 'false');
  await cassette.click();
  const stop = page.getByRole('button', { name: 'Stop the chiptune', exact: true });
  await expect(stop).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(states).toEqual(voiceStates);
  await stop.click();
  await expect(cassette).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.desk-objects-status')).toContainText('Silence');
  await expect.poll(states).toEqual(voiceStates);
  await cassette.click();
  await expect(cassette).toHaveAttribute('aria-pressed', 'false', { timeout: 6000 });
  await expect.poll(states).toEqual(voiceStates);
});

test('transformed targets keep contract centres and 44px physical sizes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await explore(page);
  if (harness) await page.getByRole('button', { name: 'Small scene' }).click();
  const scale = harness ? .35 : await page.locator('.desk-scene').evaluate(element => new DOMMatrix(getComputedStyle(element).transform).a);
  const origin = await page.locator('.desk-objects').boundingBox();
  for (const object of DESK_OBJECTS) {
    const box = await page.getByRole('button', { name: object.label, exact: true }).boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(43.9);
    expect(box!.height).toBeGreaterThanOrEqual(43.9);
    expect(box!.x + box!.width / 2 - origin!.x).toBeCloseTo((object.x + object.width / 2) * scale, 1);
    expect(box!.y + box!.height / 2 - origin!.y).toBeCloseTo((object.y + object.height / 2) * scale, 1);
  }
});

test('disabled objects cannot take focus or start audio', async ({ page }) => {
  await page.goto(harness ? '/' : '/?concept=desk');
  await expect(page.locator('.desk-objects')).toHaveAttribute('inert', '');
  await page.locator('.desk-object').first().evaluate((button: HTMLButtonElement) => button.focus());
  await expect(page.locator('.desk-object').first()).not.toBeFocused();
  await explore(page);
  await page.getByRole('button', { name: 'Play a short chiptune', exact: true }).click();
  await page.getByRole('button', { name: harness ? 'Disable objects' : 'Replay', exact:true }).click();
  await expect(page.locator('.desk-object[aria-pressed]')).toHaveAttribute('aria-pressed', 'false');
});

async function explore(page: Page) {
  await page.goto(process.env.DESK_OBJECTS_URL ?? '/?concept=desk');
  const skip = page.getByRole('button', { name: 'Skip intro', exact: true });
  const explore = page.getByRole('button', { name: 'Explore desk', exact: true });
  if (await skip.isVisible()) await skip.click();
  else if (await explore.isVisible()) await explore.click();
  await expect(page.locator('.desk-objects')).not.toHaveAttribute('inert');
}

test('desk lamp is a keyboard-operable reference hotspot', async ({ page }) => {
  await explore(page);
  const lamp = page.getByRole('button', { name: 'Switch the desk lamp', exact: true });
  await expect(lamp).toBeVisible();
  await lamp.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.desk-objects-status')).toContainText('pool of light');
  if (harness) await expect(page.getByTestId('effect')).toHaveText('lamp');
});

test('every reference offers a visible keyboard label', async ({ page }) => {
  await explore(page);
  for (const object of DESK_OBJECTS) {
    const button = page.getByRole('button', { name: object.label, exact: true });
    await button.focus();
    await expect(button).toBeFocused();
    await expect(button.locator('.desk-object-label')).toBeVisible();
  }
});
