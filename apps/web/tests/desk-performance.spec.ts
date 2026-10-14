import { expect, test } from '@playwright/test';

test('starting music never synthesizes PCM in the activation task', async ({ page }) => {
  test.skip(!!process.env.CORRAL_WEB_PRODUCTION, 'Factory import requires the dev server.');
  await page.goto('/?concept=desk');
  const result = await page.evaluate(async () => {
    const path = '/src/desk/desk-music.ts';
    const { createDeskMusic } = await import(/* @vite-ignore */ path);
    const context = new AudioContext();
    const music = createDeskMusic(context, context.destination);
    const sin = Math.sin; let calls = 0;
    Math.sin = (value: number) => { calls++; return sin(value); };
    try { music.start(); return { calls }; }
    finally { Math.sin = sin; music.dispose(); await context.close(); }
  });
  expect(result.calls).toBe(0);
});

test('TitleWorld retires RAF under reduced motion, off camera and hidden, then restarts on return', async ({ page }) => {
  test.skip(!!process.env.CORRAL_WEB_PRODUCTION, 'Named RAF probe requires development function names.');
  await page.addInitScript(() => {
    const request = requestAnimationFrame, cancel = cancelAnimationFrame;
    const probe = { pending: new Set<number>(), calls: 0 };
    Object.assign(window, { titleRAF: probe });
    window.requestAnimationFrame = callback => {
      const title = callback.name === 'render';
      const id = request(now => { probe.pending.delete(id); if (title) probe.calls++; callback(now); });
      if (title) probe.pending.add(id);
      return id;
    };
    window.cancelAnimationFrame = id => { probe.pending.delete(id); cancel(id); };
  });
  await page.goto('/?concept=desk');
  const pending = () => page.evaluate(() => Reflect.get(window, 'titleRAF').pending.size);
  await expect(page.locator('.reveal-world-screen[data-ready="true"]')).toHaveCount(8);
  expect(await pending()).toBe(0);
  await page.getByRole('button', { name: 'Step inside', exact: true }).click();
  await expect.poll(pending).toBe(8);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(pending).toBe(0);
  await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
  await expect(page.locator('.reveal-world-screen[data-ready="true"]')).toHaveCount(8);
  expect(await pending()).toBe(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(pending).toBe(8);
  await page.getByRole('button', { name: /^Desk key api —/, exact: true }).click();
  await expect(page.locator('.desk-page')).toHaveAttribute('data-view', 'monitor');
  await expect.poll(pending).toBe(0);
  await page.getByRole('button', { name: 'Back to the desk ↙', exact: true }).click();
  await expect.poll(pending).toBe(8);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable:true, value:true }); document.dispatchEvent(new Event('visibilitychange')); });
  expect(await pending()).toBe(0);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable:true, value:false }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(pending).toBe(8);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(pending).toBe(0);
});

test('worker PCM and blocked-worker fallback match while fallback yields between DSP slices', async ({ page }) => {
  test.skip(!!process.env.CORRAL_WEB_PRODUCTION, 'Factory import requires development modules.');
  await page.goto('/?concept=desk');
  const result = await page.evaluate(async () => {
    const path = '/src/desk/desk-music-loader.ts';
    const { loadDeskMusicSamples } = await import(/* @vite-ignore */ path);
    const workerPCM: Float32Array = await loadDeskMusicSamples(24000, new AbortController().signal);
    const Native = Worker;
    window.Worker = class { constructor() { throw new Error('Worker blocked by policy'); } } as unknown as typeof Worker;
    let ticks = 0; const ticker = setInterval(() => ticks++, 0);
    try {
      const fallbackPCM: Float32Array = await loadDeskMusicSamples(24000, new AbortController().signal);
      let difference = 0, peak = 0;
      for (let i=0; i<workerPCM.length; i++) {
        difference = Math.max(difference, Math.abs(workerPCM[i] - fallbackPCM[i]));
        peak = Math.max(peak, Math.abs(workerPCM[i]));
      }
      const cancel = new AbortController();
      const pending = loadDeskMusicSamples(48000, cancel.signal);
      cancel.abort();
      let aborted = false; try { await pending; } catch { aborted = true; }
      return { difference, peak, length: workerPCM.length, ticks, aborted };
    } finally { clearInterval(ticker); window.Worker = Native; }
  });
  expect(result.length).toBe(576000);
  expect(result.peak).toBeGreaterThan(.001);
  expect(result.difference).toBeLessThan(1e-7);
  expect(result.ticks).toBeGreaterThan(100);
  expect(result.aborted).toBe(true);
});

test('late synthesis after stop cannot start a voice and disposal terminates pending workers', async ({ page }) => {
  test.skip(!!process.env.CORRAL_WEB_PRODUCTION, 'Factory import requires development modules.');
  await page.goto('/?concept=desk');
  const result = await page.evaluate(async () => {
    const path = '/src/desk/desk-music.ts';
    const { createDeskMusic } = await import(/* @vite-ignore */ path);
    const Native = Worker;
    const deliveries: (() => void)[] = []; let terminated = 0;
    window.Worker = class {
      onmessage: ((event: MessageEvent) => void) | null = null;
      postMessage(rate: number) { deliveries.push(() => this.onmessage?.(new MessageEvent('message', { data:new Float32Array(rate * 24) }))); }
      terminate() { terminated++; }
    } as unknown as typeof Worker;
    const context = new AudioContext(); let sources = 0;
    const create = context.createBufferSource.bind(context);
    context.createBufferSource = () => { sources++; return create(); };
    try {
      const stopped = createDeskMusic(context, context.destination); stopped.start(); stopped.stop(true);
      deliveries.shift()!(); await stopped.prepare(); await Promise.resolve();
      const afterStop = sources; stopped.start(); const afterRestart = sources; stopped.dispose();
      const disposed = createDeskMusic(context, context.destination); disposed.start(); const pending = disposed.prepare(); disposed.dispose();
      await pending.catch(() => {}); deliveries.shift()!(); await Promise.resolve();
      return { afterStop, afterRestart, sources, terminated };
    } finally { window.Worker = Native; await context.close(); }
  });
  expect(result).toEqual({ afterStop:0, afterRestart:1, sources:1, terminated:2 });
});
