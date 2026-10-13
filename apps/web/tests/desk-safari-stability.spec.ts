import { expect, test } from '@playwright/test';

// These lifecycle scenarios target the approved phone camera path, including
// when this spec runs through the main desktop-default Playwright config.
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('lamp beam starts at the bulb and stays centred below it', async ({ page }) => {
  await page.goto('/?concept=desk');
  const beam = await page.locator('.desk-art-lamp-halo').evaluate((element: SVGGraphicsElement) => {
    const bulb = document.querySelector<SVGGraphicsElement>('.desk-art-bulb')!.getBBox();
    const box = element.getBBox();
    const start = element.getAttribute('d')!.match(/^M(\d+) (\d+)h(\d+)/)!.slice(1).map(Number);
    return { start, bulb: { x: bulb.x, y: bulb.y + bulb.height, width: bulb.width }, centre: box.x + box.width / 2, bulbCentre: bulb.x + bulb.width / 2 };
  });
  expect(beam.start).toEqual([beam.bulb.x, beam.bulb.y, beam.bulb.width]);
  expect(beam.centre).toEqual(beam.bulbCentre);
});

test('room compositor has no oversized offscreen backdrop', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'LayerTree is a Chromium diagnostic; WebKit stress runs separately');
  await page.goto('/?concept=desk');
  await page.getByRole('button', { name: 'Skip intro', exact: true }).tap({ force: true });
  await page.waitForTimeout(1700);
  const session = await page.context().newCDPSession(page);
  let layers: { width: number; height: number; drawsContent: boolean }[] = [];
  session.on('LayerTree.layerTreeDidChange', event => { layers = event.layers ?? []; });
  await session.send('LayerTree.enable');
  await expect.poll(() => layers.length).toBeGreaterThan(0);
  expect(Math.max(...layers.filter(layer => layer.drawsContent).map(layer => layer.width))).toBeLessThan(5000);
  expect(Math.max(...layers.filter(layer => layer.drawsContent).map(layer => layer.height))).toBeLessThan(5000);
});

test('repeated entry, cameras, props, mute and visibility do not reload or leak live audio', async ({ page }, info) => {
  // Linux WebKit's live audio backend can starve RAF-based actionability after
  // context close/resume. Keep this lifecycle loop independent of that timing;
  // the separate muted camera loop below exercises real animated compositing.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const crashes: string[] = [], navigations: string[] = [], errors: string[] = [], hmr: string[] = [];
  page.on('crash', () => crashes.push('crash'));
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations.push(frame.url()); });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (/vite|reload|hmr/i.test(message.text())) hmr.push(message.text()); });
  await page.addInitScript(() => {
    const Native = window.AudioContext;
    const contexts: AudioContext[] = [];
    let started = 0, ended = 0;
    const voices = new Set<AudioScheduledSourceNode>();
    Object.assign(window, { deskStress: { contexts, voices, get started() { return started; }, get ended() { return ended; } } });
    window.AudioContext = class extends Native {
      constructor(options?: AudioContextOptions) { super(options); contexts.push(this); }
      override createOscillator() {
        const node = super.createOscillator();
        node.addEventListener('ended', () => { ended++; voices.delete(node); });
        const start = node.start.bind(node); node.start = (...args: Parameters<typeof node.start>) => { started++; voices.add(node); start(...args); }; return node;
      }
      override createBufferSource() {
        const node = super.createBufferSource();
        node.addEventListener('ended', () => { ended++; voices.delete(node); });
        const start = node.start.bind(node); node.start = (...args: Parameters<typeof node.start>) => { started++; voices.add(node); start(...args); }; return node;
      }
    };
  });
  await page.goto('/?concept=desk');
  await page.getByRole('button', { name: 'Step inside', exact: true }).tap({ force: true });
  await expect(page.locator('.desk-dialogue-typed')).toContainText('Psst');
  await page.getByRole('button', { name: 'Skip intro', exact: true }).tap({ force: true });
  const state = () => page.evaluate(() => {
    const probe = (window as unknown as { deskStress: { contexts: AudioContext[]; voices: Set<AudioScheduledSourceNode>; started: number; ended: number } }).deskStress;
    return { contexts: probe.contexts.map(context => context.state), live: probe.contexts.filter(context => context.state !== 'closed').length, sources: [...probe.voices].filter(node => (node.context as AudioContext).state !== 'closed').length, started: probe.started, ended: probe.ended, canvases: document.querySelectorAll('canvas').length };
  });
  const samples: (Awaited<ReturnType<typeof state>> & { cycle: number })[] = [];
  for (let cycle = 0; cycle < 12; cycle++) {
    await page.getByRole('button', { name: 'Zoom in on the Stream Deck', exact: true }).tap({ force: true });
    await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'device');
    await page.getByRole('button', { name: 'Desk key api', exact: true }).tap({ force: true });
    await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'monitor');
    await page.getByRole('button', { name: 'Open arcade', exact: true }).tap({ force: true });
    await page.getByRole('button', { name: 'Open terminal', exact: true }).tap({ force: true });
    await page.getByRole('button', { name: 'Back to the desk ↙', exact: true }).tap({ force: true });
    await page.getByRole('button', { name: 'Switch the desk lamp', exact: true }).tap({ force: true });
    const complete = page.getByRole('button', { name: 'Complete dialogue', exact: true });
    if (await complete.isVisible()) await complete.tap({ force: true });
    const dismiss = page.getByRole('button', { name: 'Dismiss dialogue', exact: true });
    if (await dismiss.isVisible()) await dismiss.tap({ force: true });
    await page.getByRole('button', { name: 'Mute desk sound', exact: true }).tap({ force: true });
    await expect.poll(async () => (await state()).live).toBe(0);
    // A fault-injected visibility transition exercises source disposal; this is
    // not a claim that Playwright simulates physical iOS background suspension.
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.getByRole('button', { name: 'Enable desk sound', exact: true }).tap({ force: true });
    await page.evaluate(() => { delete (document as unknown as { hidden?: boolean }).hidden; document.dispatchEvent(new Event('visibilitychange')); });
    await page.getByRole('button', { name: 'Replay', exact: true }).tap({ force: true });
    await expect.poll(async () => (await state()).live).toBe(1);
    samples.push({ cycle, ...await state() });
    if (await complete.isVisible()) await complete.tap({ force: true });
    if (await dismiss.isVisible()) await dismiss.tap({ force: true });
    // Replay consistently returns to device closeup; resume room exploration.
    await page.getByRole('button', { name: 'Skip intro', exact: true }).tap({ force: true });
  }
  await page.getByRole('button', { name: 'Mute desk sound', exact: true }).tap({ force: true });
  await expect.poll(async () => (await state()).sources).toBe(0);
  const evidence = { crashes, navigations, errors, hmr, samples, final: await state() };
  await info.attach('stability-evidence', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  console.log('STABILITY', JSON.stringify(evidence));
  expect(crashes).toEqual([]); expect(errors).toEqual([]); expect(navigations).toHaveLength(1);
  expect(samples.every(sample => sample.canvases === samples[0].canvases)).toBe(true);
});

test('animated camera stress stays in one document with sound muted', async ({ page }, info) => {
  const crashes: string[] = [], navigations: string[] = [], errors: string[] = [];
  page.on('crash', () => crashes.push('crash'));
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations.push(frame.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?concept=desk');
  await page.getByRole('button', { name: 'Mute desk sound', exact: true }).tap();
  await page.getByRole('button', { name: 'Step inside', exact: true }).tap();
  await page.waitForTimeout(1700);
  await page.getByRole('button', { name: 'Skip intro', exact: true }).tap();
  for (let cycle = 0; cycle < 8; cycle++) {
    await page.waitForTimeout(1700);
    await page.getByRole('button', { name: 'Zoom in on the Stream Deck', exact: true }).tap();
    await page.waitForTimeout(1700);
    await page.getByRole('button', { name: 'Desk key api', exact: true }).tap();
    await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'monitor');
    await page.getByRole('button', { name: 'Back to the desk ↙', exact: true }).tap();
    await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'room');
  }
  await info.attach('animated-stability', { body: JSON.stringify({ cycles: 8, crashes, navigations, errors }), contentType: 'application/json' });
  expect(crashes).toEqual([]); expect(errors).toEqual([]); expect(navigations).toHaveLength(1);
});
