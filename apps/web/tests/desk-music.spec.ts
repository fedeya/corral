import { expect, test } from '@playwright/test';

type MusicProbe = { contexts: AudioContext[]; loops: AudioBufferSourceNode[]; live: number; starts: { state: AudioContextState; duration: number }[]; release?: () => void };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const Native = window.AudioContext;
    const state: MusicProbe = { contexts: [], loops: [], live: 0, starts: [] };
    Object.assign(window, { musicProbe: state });
    window.AudioContext = class extends Native {
      constructor(options?: AudioContextOptions) { super(options); state.contexts.push(this); }
      override createBufferSource() {
        const source = super.createBufferSource();
        const start = source.start.bind(source), stop = source.stop.bind(source);
        let live = false;
        source.start = (at?: number, offset?: number, duration?: number) => {
          if (source.loop) {
            state.loops.push(source); live = true; state.live++;
            state.starts.push({ state: this.state, duration: source.buffer?.duration ?? 0 });
          }
          start(at, offset, duration);
        };
        source.stop = (at?: number) => {
          if (live && (at === undefined || at <= this.currentTime)) { live = false; state.live--; }
          stop(at);
        };
        source.addEventListener('ended', () => { if (live) { live = false; state.live--; } });
        return source;
      }
    };
  });
});

test('music waits for a trusted activation, shares the master across props and Replay, and mutes', async ({ page }) => {
  await page.goto('/?concept=desk');
  await page.evaluate(() => {
    window.dispatchEvent(new PointerEvent('pointerdown'));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  });
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => (window as unknown as { musicProbe: MusicProbe }).musicProbe.contexts.length)).toBe(0);
  await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { musicProbe: MusicProbe }).musicProbe.live)).toBe(1);
  expect(await page.evaluate(() => (window as unknown as { musicProbe: MusicProbe }).musicProbe.starts)).toEqual([{ state: 'running', duration: 24 }]);
  await page.getByRole('button', { name: 'Ask the rubber duck', exact: true }).click();
  await page.getByRole('button', { name: 'Close dialogue', exact: true }).click();
  await page.getByRole('button', { name: 'Play a short chiptune', exact: true }).click();
  await page.getByRole('button', { name: 'Close dialogue', exact: true }).click();
  await page.getByRole('button', { name: 'Stop the chiptune', exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { musicProbe: MusicProbe }).musicProbe.live)).toBe(1);
  expect(await page.evaluate(() => (window as unknown as { musicProbe: MusicProbe }).musicProbe.contexts.length)).toBe(1);
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { musicProbe: MusicProbe }).musicProbe.loops.length)).toBe(2);
  expect(await page.evaluate(() => (window as unknown as { musicProbe: MusicProbe }).musicProbe.live)).toBe(1);
  await page.getByRole('button', { name: 'Mute desk sound', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { musicProbe: MusicProbe }).musicProbe.contexts.map(c => c.state))).toEqual(['closed']);
  expect(await page.evaluate(() => (window as unknown as { musicProbe: MusicProbe }).musicProbe.live)).toBe(0);
  const count = await page.evaluate(() => (window as unknown as { musicProbe: MusicProbe }).musicProbe.loops.length);
  await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { musicProbe: MusicProbe }).musicProbe.loops.length)).toBe(count);
  await page.getByRole('button', { name: 'Enable desk sound', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { musicProbe: MusicProbe }).musicProbe.live)).toBe(1);
});

test('blocked workers still produce music through the same gesture-unlocked master', async ({ page }) => {
  await page.addInitScript(() => {
    window.Worker = class { constructor() { throw new Error('Worker blocked by policy'); } } as unknown as typeof Worker;
  });
  await page.goto('/?concept=desk');
  await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { musicProbe: MusicProbe }).musicProbe.live), { timeout:15000 }).toBe(1);
  const samples = await page.evaluate(() => {
    const audio = (window as unknown as { musicProbe: MusicProbe }).musicProbe;
    const pcm = audio.loops[0].buffer!.getChannelData(0);
    let peak=0; for (const value of pcm) peak=Math.max(peak,Math.abs(value));
    return { peak, contexts:audio.contexts.length, duration:audio.loops[0].buffer!.duration };
  });
  expect(samples.peak).toBeGreaterThan(.001);
  expect(samples.contexts).toBe(1); expect(samples.duration).toBe(24);
  await page.getByRole('button', { name: 'Mute desk sound', exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { musicProbe: MusicProbe }).musicProbe.live)).toBe(0);
});

test('visibility pauses every music source and resumes on the same armed context', async ({ page }) => {
  await page.goto('/?concept=desk');
  await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { musicProbe: MusicProbe }).musicProbe.live)).toBe(1);
  // Drive the document lifecycle handler explicitly: headless foreground tabs
  // do not reliably become hidden when a second page is brought to front.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(await page.evaluate(() => (window as unknown as { musicProbe: MusicProbe }).musicProbe.live)).toBe(0);
  expect(await page.evaluate(() => (window as unknown as { musicProbe: MusicProbe }).musicProbe.contexts[0].state)).toBe('running');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as { musicProbe: MusicProbe }).musicProbe.live)).toBe(1);
  expect(await page.evaluate(() => (window as unknown as { musicProbe: MusicProbe }).musicProbe.contexts.length)).toBe(1);
  await page.getByRole('button', { name: 'Mute desk sound', exact: true }).click();
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(await page.evaluate(() => (window as unknown as { musicProbe: MusicProbe }).musicProbe.live)).toBe(0);
});

test('a pending resume never starts music before running or after mute', async ({ page }) => {
  await page.goto('/?concept=desk');
  await page.evaluate(() => {
    const resume = AudioContext.prototype.resume;
    const nativeState = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, 'state')!.get!;
    AudioContext.prototype.resume = function () {
      // Native Chromium may auto-run a context created inside a gesture. A
      // genuinely pending resume must also model a suspended context, including
      // the Safari retry path, while still exposing native close on mute.
      Object.defineProperty(this, 'state', { configurable:true, get:()=>nativeState.call(this)==='closed' ? 'closed' : 'suspended' });
      return new Promise<void>(resolve => {
        (window as unknown as { musicProbe: MusicProbe }).musicProbe.release = () => { Reflect.deleteProperty(this,'state'); void resume.call(this).then(resolve).catch(resolve); };
      });
    };
  });
  await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { musicProbe: MusicProbe }).musicProbe.loops.length)).toBe(0);
  await page.getByRole('button', { name: 'Mute desk sound', exact: true }).click();
  await page.evaluate(() => (window as unknown as { musicProbe: MusicProbe }).musicProbe.release?.());
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => (window as unknown as { musicProbe: MusicProbe }).musicProbe.loops.length)).toBe(0);
  await expect.poll(() => page.evaluate(() => (window as unknown as { musicProbe: MusicProbe }).musicProbe.contexts.map(c => c.state))).toEqual(['closed']);
});

test('factory fades out, resets without stacking voices, and dispose cancels every node and timer', async ({ page }) => {
  test.skip(!!process.env.CORRAL_WEB_PRODUCTION, 'Production preview does not expose the dev-only music factory module for offline rendering.');
  await page.goto('/?concept=desk');
  const metrics = await page.evaluate(async () => {
    const path = '/src/desk/desk-music.ts';
    const { createDeskMusic } = await import(/* @vite-ignore */ path);
    const rate = 24000;
    const c = new OfflineAudioContext(1, rate * 2, rate);
    const music = createDeskMusic(c, c.destination); await music.prepare(); music.start();
    const pause = c.suspend(.5).then(async () => { music.stop(); await c.resume(); });
    const pcm = (await c.startRendering()).getChannelData(0); await pause;
    let beforePeak = 0, afterPeak = 0;
    for (let i = 0; i < pcm.length; i++) {
      if (i < rate * .5) beforePeak = Math.max(beforePeak, Math.abs(pcm[i]));
      if (i > rate * .7) afterPeak = Math.max(afterPeak, Math.abs(pcm[i]));
    }
    music.dispose();
    const liveContext = new AudioContext();
    let live = 0, peakLive = 0, disconnected = 0;
    const native = liveContext.createBufferSource.bind(liveContext);
    liveContext.createBufferSource = () => {
      const node = native(); const start = node.start.bind(node), stop = node.stop.bind(node), disconnect = node.disconnect.bind(node);
      let counted = false;
      node.start = (at?: number) => { counted = true; live++; peakLive = Math.max(peakLive, live); start(at); };
      node.stop = (at?: number) => { if (counted && (at === undefined || at <= liveContext.currentTime)) { counted = false; live--; } stop(at); };
      node.disconnect = () => { disconnected++; disconnect(); };
      return node;
    };
    const nativeTimeout = window.setTimeout, nativeClear = window.clearTimeout;
    const pending = new Set<number>();
    window.setTimeout = ((handler: TimerHandler, delay?: number) => {
      const id = nativeTimeout(handler, delay); pending.add(id); return id;
    }) as typeof window.setTimeout;
    window.clearTimeout = ((id?: number) => { if (id !== undefined) pending.delete(id); nativeClear(id); }) as typeof window.clearTimeout;
    try {
      const reset = createDeskMusic(liveContext, liveContext.destination); await reset.prepare();
      for (let i = 0; i < 30; i++) { reset.start(); reset.stop(); }
      reset.dispose(); reset.start();
      return { beforePeak, afterPeak, live, peakLive, disconnected, pendingTimers: pending.size };
    } finally { window.setTimeout = nativeTimeout; window.clearTimeout = nativeClear; await liveContext.close(); }
  });
  expect(metrics.beforePeak).toBeGreaterThan(.001);
  expect(metrics.afterPeak).toBe(0);
  expect(metrics.peakLive).toBe(1);
  expect(metrics.live).toBe(0);
  expect(metrics.disconnected).toBe(30);
  expect(metrics.pendingTimers).toBe(0);
});

test('actual rendered PCM is quiet, non-silent and seamless across a complete loop', async ({ page }) => {
  test.skip(!!process.env.CORRAL_WEB_PRODUCTION, 'Production preview does not serve TypeScript source modules; offline PCM factory imports are dev-only. Integrated source/lifecycle probes still run in production.');
  await page.goto('/?concept=desk');
  const metrics = await page.evaluate(async () => {
    const musicPath = '/src/desk/desk-music.ts';
    const sfxPath = '/src/desk/desk-sfx.ts';
    const { createDeskMusic } = await import(/* @vite-ignore */ musicPath);
    const { createDeskSynth } = await import(/* @vite-ignore */ sfxPath);
    const rate = 24000;
    const c = new OfflineAudioContext(1, rate * 50, rate);
    let sources = 0, oscillators = 0;
    const source = c.createBufferSource.bind(c), oscillator = c.createOscillator.bind(c);
    c.createBufferSource = () => { sources++; return source(); };
    c.createOscillator = () => { oscillators++; return oscillator(); };
    const music = createDeskMusic(c, c.destination); await music.prepare(); music.start(); music.start();
    const pcm = (await c.startRendering()).getChannelData(0);
    let peak = 0, energy = 0, loopError = 0, maxStep = 0;
    for (let i = rate * 2; i < pcm.length; i++) {
      peak = Math.max(peak, Math.abs(pcm[i])); energy += pcm[i] ** 2;
      maxStep = Math.max(maxStep, Math.abs(pcm[i] - pcm[i - 1]));
      if (i >= rate * 26) loopError = Math.max(loopError, Math.abs(pcm[i] - pcm[i - rate * 24]));
    }
    const seamStep = Math.abs(pcm[rate * 24] - pcm[rate * 24 - 1]);
    music.dispose(); music.start();
    const foley = new OfflineAudioContext(1, rate, rate);
    createDeskSynth(foley, foley.destination).play('duck');
    const duck = (await foley.startRendering()).getChannelData(0);
    let duckPeak = 0; for (const value of duck) duckPeak = Math.max(duckPeak, Math.abs(value));
    const silent = new OfflineAudioContext(1, rate, rate);
    const disposed = createDeskMusic(silent, silent.destination); disposed.start(); disposed.dispose();
    const silence = (await silent.startRendering()).getChannelData(0);
    let disposedPeak = 0; for (const value of silence) disposedPeak = Math.max(disposedPeak, Math.abs(value));
    return { peak, rms: Math.sqrt(energy / (pcm.length - rate * 2)), loopError, seamStep, maxStep, sources, oscillators, duckPeak, disposedPeak };
  });
  await test.info().attach('night-desk-real-pcm', { body: JSON.stringify(metrics, null, 2), contentType: 'application/json' });
  expect(metrics.peak).toBeGreaterThan(.001);
  expect(metrics.peak).toBeLessThan(.02);
  expect(metrics.rms).toBeGreaterThan(.0001);
  expect(metrics.peak).toBeLessThan(metrics.duckPeak * .4);
  expect(metrics.loopError).toBeLessThan(.000001);
  expect(metrics.seamStep).toBeLessThan(.002);
  expect(metrics.sources).toBe(1); expect(metrics.oscillators).toBe(0);
  expect(metrics.disposedPeak).toBe(0);
});
