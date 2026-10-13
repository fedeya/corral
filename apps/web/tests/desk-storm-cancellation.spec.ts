import { expect, test } from '@playwright/test';

test('actual bolt cues delayed thunder; lamp, Replay, hidden and mute cancel the pending source', async ({ page }) => {
  await page.addInitScript(() => {
    const Native = AudioContext;
    const p = { bolts: [] as number[], thunder: [] as { stamp: number; delay: number; stopped: boolean }[] };
    Object.assign(window, { weatherCancellation: p });
    document.addEventListener('animationstart', e => { if ((e as AnimationEvent).animationName === 'desk-storm-bolt') p.bolts.push(performance.now()); }, true);
    window.AudioContext = class extends Native {
      override createBufferSource() {
        const s = super.createBufferSource(), start = s.start.bind(s), stop = s.stop.bind(s);
        let entry: typeof p.thunder[number] | undefined;
        s.start = (at?: number) => { if (!s.loop && s.buffer?.duration === 4) { entry = { stamp: performance.now(), delay: (at ?? this.currentTime) - this.currentTime, stopped: false }; p.thunder.push(entry); } start(at); };
        s.stop = (at?: number) => { if (entry) entry.stopped = true; stop(at); };
        return s;
      }
    };
  });
  await page.goto('/?concept=desk');
  await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
  const lamp = page.getByRole('button', { name: 'Switch the desk lamp', exact: true });
  await lamp.click();
  const read = () => page.evaluate(() => (window as unknown as { weatherCancellation: { bolts: number[]; thunder: { stamp: number; delay: number; stopped: boolean }[] } }).weatherCancellation);
  for (const action of ['lamp', 'Replay', 'hidden', 'mute']) {
    const count = (await read()).thunder.length;
    // Allow the new CSS animation to acquire a document-timeline startTime
    // before seeking; Chromium can otherwise retain the cancelled cycle's time.
    await page.locator('.desk-art-lightning-bolt').evaluate(async el => {
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const a = el.getAnimations()[0]; a.currentTime = 6950;
    });
    await expect.poll(async () => (await read()).thunder.length).toBe(count + 1);
    const p = await read(), t = p.thunder.at(-1)!;
    // Node/filter allocation can cross a few native audio render quanta.
    expect(t.delay).toBeGreaterThan(.85);
    expect(t.delay).toBeLessThanOrEqual(.91);
    expect(t.stamp - p.bolts.at(-1)!).toBeGreaterThanOrEqual(0);
    // Event dispatch can be delayed by parallel headless rendering; the audio
    // timeline delay itself is asserted exactly above, not a wall-clock timer.
    expect(t.stamp - p.bolts.at(-1)!).toBeLessThan(500);
    if (action === 'lamp') await lamp.click();
    else if (action === 'hidden') await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    else await page.getByRole('button', { name: action === 'mute' ? 'Mute desk sound' : action, exact: true }).click();
    expect((await read()).thunder.at(-1)!.stopped).toBe(true);
    await page.waitForTimeout(1000);
    expect((await read()).thunder.length).toBe(count + 1);
    if (action === 'lamp') await lamp.click();
    if (action === 'hidden') await page.evaluate(() => { Reflect.deleteProperty(document, 'hidden'); document.dispatchEvent(new Event('visibilitychange')); });
    // Replay preserves the lamp, but restart the visual cycle before seeking.
    if (action === 'Replay') {
      await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
      await lamp.click();
      await expect(page.locator('.desk-art-lightning-bolt')).toHaveCSS('animation-name', 'none');
      await lamp.click();
    }
    if (action !== 'mute') await expect.poll(() => page.locator('.desk-art-lightning-bolt').evaluate(el => Number(el.getAnimations()[0]?.currentTime ?? 99999))).toBeLessThan(6000);
  }
});

test('a pending resume cannot resurrect rain after lamp on or mute', async ({ page }) => {
  await page.addInitScript(() => {
    const Native = AudioContext;
    const p = { rain: 0, release: undefined as (() => void) | undefined };
    Object.assign(window, { pendingWeather: p });
    window.AudioContext = class extends Native {
      override resume() {
        const native = super.resume.bind(this);
        const state = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, 'state')!.get!;
        Object.defineProperty(this, 'state', { configurable: true, get: () => state.call(this) === 'closed' ? 'closed' : 'suspended' });
        return new Promise<void>(resolve => { p.release = () => { Reflect.deleteProperty(this, 'state'); void native().then(resolve).catch(resolve); }; });
      }
      override createBufferSource() {
        const s = super.createBufferSource(), start = s.start.bind(s);
        s.start = (at?: number) => { if (s.loop && s.buffer?.duration === 8) p.rain++; start(at); }; return s;
      }
    };
  });
  await page.goto('/?concept=desk');
  await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
  const lamp = page.getByRole('button', { name: 'Switch the desk lamp', exact: true });
  await lamp.click(); await lamp.click();
  await page.getByRole('button', { name: 'Mute desk sound', exact: true }).click();
  await page.evaluate(() => (window as unknown as { pendingWeather: { release?: () => void } }).pendingWeather.release?.());
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => (window as unknown as { pendingWeather: { rain: number } }).pendingWeather.rain)).toBe(0);
});
