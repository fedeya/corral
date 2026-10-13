import { expect, test } from '@playwright/test';

const harness = process.env.DESK_SOUND_HARNESS;
type AudioProbe = { contexts: AudioContext[]; sources: number; live: number; peak: number; release?: () => void };
const probe = () => (window as unknown as { soundProbe: AudioProbe }).soundProbe;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const Native = window.AudioContext;
    const state = { contexts: [] as AudioContext[], sources: 0, live: 0, peak: 0 };
    Object.assign(window, { soundProbe: state });
    window.AudioContext = class extends Native {
      constructor(options?: AudioContextOptions) { super(options); state.contexts.push(this); }
      override createOscillator() {
        const node = super.createOscillator(); state.sources++;
        const start = node.start.bind(node), stop = node.stop.bind(node);
        let live = false;
        node.start = (at?: number) => { live = true; state.live++; state.peak = Math.max(state.peak, state.live); start(at); };
        node.stop = (at?: number) => { if (at === undefined && live) { live = false; state.live--; } stop(at); };
        node.addEventListener('ended', () => { if (live) { live = false; state.live--; } });
        return node;
      }
      override createBufferSource() { state.sources++; return super.createBufferSource(); }
    };
  });
});

test('one gesture-unlocked master owns cassette, effects and mute', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(harness ?? '/?concept=desk');
  expect(await page.evaluate(probe).then(s => s.contexts.length)).toBe(0);
  await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { soundProbe: AudioProbe }).soundProbe.contexts.length)).toBe(1);
  // Keep the 2.45s automatic cassette completion from racing slow WebKit
  // transport while testing manual stop. Native AudioContext still runs.
  await page.clock.install({ time: new Date(0) });
  await page.clock.pauseAt(new Date(60_000));
  await page.getByRole('button', { name: harness ? 'cassette' : 'Play a short chiptune', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { soundProbe: AudioProbe }).soundProbe.sources)).toBeGreaterThan(0);
  expect(await page.evaluate(() => (window as unknown as { soundProbe: AudioProbe }).soundProbe.contexts.length)).toBe(1);
  if (!harness) await page.getByRole('button', { name: 'Close dialogue', exact: true }).click();
  await page.getByRole('button', { name: harness ? 'cassette-stop' : 'Stop the chiptune', exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { soundProbe: AudioProbe }).soundProbe.contexts[0].state)).toBe('running');
  await page.getByRole('button', { name: 'Mute desk sound', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { soundProbe: AudioProbe }).soundProbe.contexts.map(c => c.state))).toEqual(['closed']);
  const before = await page.evaluate(() => (window as unknown as { soundProbe: AudioProbe }).soundProbe.sources);
  if (!harness) await page.getByRole('button', { name: 'Close dialogue', exact: true }).click();
  await page.getByRole('button', { name: harness ? 'duck' : 'Ask the rubber duck', exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { soundProbe: AudioProbe }).soundProbe.sources)).toBe(before);
});

test('pending resume cannot leak effects across reset, mute or unmount', async ({ page }) => {
  test.skip(!harness, 'isolated lifecycle harness');
  await page.goto(harness!);
  await page.evaluate(() => {
    const native = AudioContext.prototype.resume;
    AudioContext.prototype.resume = function () {
      return new Promise<void>(resolve => {
        (window as unknown as { soundProbe: AudioProbe }).soundProbe.release = () => { void native.call(this).then(resolve); };
      });
    };
  });
  await page.getByRole('button', { name: 'duck', exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { soundProbe: AudioProbe }).soundProbe.sources)).toBe(0);
  await page.getByRole('button', { name: 'stopEffects', exact: true }).click();
  await page.evaluate(() => (window as unknown as { soundProbe: AudioProbe }).soundProbe.release?.());
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => (window as unknown as { soundProbe: AudioProbe }).soundProbe.sources)).toBe(0);
  await page.getByRole('button', { name: 'duck', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { soundProbe: AudioProbe }).soundProbe.sources)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Unmount', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { soundProbe: AudioProbe }).soundProbe.contexts.map(c => c.state))).toEqual(['closed']);
});

for (const action of ['Mute desk sound', 'Unmount']) {
  test(`pending resume is cancelled by ${action}`, async ({ page }) => {
    test.skip(!harness, 'isolated lifecycle harness');
    await page.goto(harness!);
    await page.evaluate(() => {
      AudioContext.prototype.resume = function () {
        return new Promise<void>(resolve => {
          (window as unknown as { soundProbe: AudioProbe }).soundProbe.release = resolve;
        });
      };
    });
    await page.getByRole('button', { name: 'duck', exact: true }).click();
    await page.getByRole('button', { name: action, exact: true }).click();
    await page.evaluate(() => (window as unknown as { soundProbe: AudioProbe }).soundProbe.release?.());
    await page.waitForTimeout(80);
    expect(await page.evaluate(() => (window as unknown as { soundProbe: AudioProbe }).soundProbe.sources)).toBe(0);
    await expect.poll(() => page.evaluate(() => (window as unknown as { soundProbe: AudioProbe }).soundProbe.contexts.map(c => c.state))).toEqual(['closed']);
  });
}

test('bounded effects preserve separate cassette and stopEffects silences every source', async ({ page }) => {
  test.skip(!!process.env.CORRAL_WEB_PRODUCTION && !harness, 'Offline synthesis uses the dev module or isolated harness');
  await page.goto(harness ?? '/?concept=desk');
  const result = await page.evaluate(async () => {
    const path = '/src/desk/desk-sfx.ts';
    const module = await import(/* @vite-ignore */ path);
    const c = new OfflineAudioContext(1, 144000, 48000);
    const synth = module.createDeskSynth(c, c.destination);
    const original = c.createOscillator.bind(c);
    let stops = 0;
    c.createOscillator = () => { const node = original(); const stop = node.stop.bind(node); node.stop = (at?: number) => { if (at === undefined) stops++; stop(at); }; return node; };
    synth.play('cassette');
    for (let i = 0; i < 40; i++) synth.play('duck');
    const beforeStop = stops;
    synth.play('cassette-stop');
    const musicStopped = stops - beforeStop;
    synth.stopEffects();
    const buffer = await c.startRendering();
    return { beforeStop, musicStopped, peak: Math.max(...buffer.getChannelData(0).subarray(0, 30000).map(Math.abs)) };
  });
  expect(result.beforeStop).toBe(72); // 36 evictions × two quack oscillators
  expect(result.musicStopped).toBe(12); // still-live melody and bass, untouched by effects
  expect(result.peak).toBe(0);
});

test('all thirteen props render distinct quiet procedural waveforms', async ({ page }) => {
  test.skip(!!process.env.CORRAL_WEB_PRODUCTION && !harness, 'Offline synthesis uses the dev module or isolated harness');
  await page.goto(harness ?? '/?concept=desk');
  const metrics = await page.evaluate(async () => {
    const path = '/src/desk/desk-sfx.ts';
    const { createDeskSynth } = await import(/* @vite-ignore */ path);
    const results: { cue: string; peak: number; rms: number; seconds: number; signature: number }[] = [];
    for (const cue of ['lamp', 'coffee', 'duck', 'rocket', 'plant', 'floppy', 'controller', 'cassette', 'books', 'poster', 'physics', 'window', 'keyboard']) {
      const c = new OfflineAudioContext(1, 144000, 48000);
      createDeskSynth(c, c.destination).play(cue);
      const pcm = (await c.startRendering()).getChannelData(0);
      let peak = 0, energy = 0, last = 0, signature = 0;
      for (let i = 0; i < pcm.length; i++) { peak = Math.max(peak, Math.abs(pcm[i])); energy += pcm[i] ** 2; if (Math.abs(pcm[i]) > .0001) last = i; signature += pcm[i] * ((i % 997) + 1); }
      results.push({ cue, peak, rms: Math.sqrt(energy / pcm.length), seconds: last / 48000, signature });
    }
    return results;
  });
  await test.info().attach('desk-sound-pcm', { body: JSON.stringify(metrics, null, 2), contentType: 'application/json' });
  for (const m of metrics) { expect(m.peak, m.cue).toBeGreaterThan(.001); expect(m.peak, m.cue).toBeLessThan(.15); expect(m.rms, m.cue).toBeGreaterThan(.0001); }
  expect(new Set(metrics.map(m => m.signature.toFixed(5))).size).toBe(13);
  expect(metrics.find(m => m.cue === 'keyboard')!.seconds).toBeLessThan(1);
  expect(metrics.find(m => m.cue === 'cassette')!.seconds).toBeGreaterThan(2.2);
  expect(metrics.find(m => m.cue === 'cassette')!.seconds).toBeLessThan(2.6);
});

test('untrusted gestures and navigation keys do not allocate a context', async ({ page }) => {
  test.skip(!harness, 'isolated lifecycle harness');
  await page.goto(harness!);
  await page.evaluate(() => {
    window.dispatchEvent(new PointerEvent('pointerdown'));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  });
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => (window as unknown as { soundProbe: AudioProbe }).soundProbe.contexts.length)).toBe(0);
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as unknown as { soundProbe: AudioProbe }).soundProbe.contexts.length)).toBe(1);
});

test('procedural duck renders real quiet non-silent PCM', async ({ page }) => {
  test.skip(!!process.env.CORRAL_WEB_PRODUCTION && !harness, 'Offline synthesis uses the dev module or isolated harness');
  await page.goto(harness ?? '/?concept=desk');
  const metrics = await page.evaluate(async () => {
    const path = '/src/desk/desk-sfx.ts';
    const module = await import(/* @vite-ignore */ path);
    const context = new OfflineAudioContext(1, 48000, 48000);
    const synth = module.createDeskSynth(context, context.destination);
    synth.play('duck');
    const rendered = await context.startRendering();
    const pcm = rendered.getChannelData(0);
    let peak = 0, energy = 0, last = 0;
    for (let i = 0; i < pcm.length; i++) { peak = Math.max(peak, Math.abs(pcm[i])); energy += pcm[i] ** 2; if (Math.abs(pcm[i]) > .0001) last = i; }
    return { peak, rms: Math.sqrt(energy / pcm.length), seconds: last / 48000 };
  });
  expect(metrics.peak).toBeGreaterThan(.001);
  expect(metrics.peak).toBeLessThan(.15);
  expect(metrics.rms).toBeGreaterThan(.0001);
  expect(metrics.seconds).toBeGreaterThan(.15);
  expect(metrics.seconds).toBeLessThan(.65);
});
