import { expect, test } from '@playwright/test';

test('dark room starts real rain on the shared context and lamp stops it', async ({ page }) => {
  await page.addInitScript(() => {
    const Native = AudioContext;
    const probe = { contexts: [] as AudioContext[], rain: [] as AudioBufferSourceNode[], stopped: 0, thunder: [] as number[] };
    Object.assign(window, { stormProbe: probe });
    window.AudioContext = class extends Native {
      constructor() { super(); probe.contexts.push(this); }
      override createBufferSource() {
        const node = super.createBufferSource(), start = node.start.bind(node), stop = node.stop.bind(node);
        node.start = (at?: number) => { if (node.loop && node.buffer?.duration === 8) probe.rain.push(node); if (!node.loop && node.buffer?.duration === 4) probe.thunder.push(performance.now()); start(at); };
        node.stop = (at?: number) => { if (node.loop && node.buffer?.duration === 8) probe.stopped++; stop(at); };
        return node;
      }
    };
  });
  await page.goto('/?concept=desk');
  const state = () => page.evaluate(() => { const p = (window as unknown as { stormProbe: { contexts: AudioContext[]; rain: AudioBufferSourceNode[]; stopped: number; thunder: number[] } }).stormProbe; return { contexts: p.contexts.length, rain: p.rain.length, stopped: p.stopped, thunder: p.thunder.length, states: p.contexts.map(c => c.state) }; });
  expect((await state()).contexts).toBe(0);
  await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
  await page.getByRole('button', { name: 'Switch the desk lamp', exact: true }).click();
  await expect.poll(async () => (await state()).rain).toBe(1);
  expect((await state()).contexts).toBe(1);
  await page.getByRole('button', { name: 'Switch the desk lamp', exact: true }).click();
  await expect.poll(async () => (await state()).stopped).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Switch the desk lamp', exact: true }).click();
  await expect.poll(async () => (await state()).rain).toBe(2);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(async () => (await state()).stopped).toBeGreaterThan(1);
  await page.evaluate(() => { Reflect.deleteProperty(document, 'hidden'); document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(async () => (await state()).rain).toBe(3);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(8000);
  expect((await state()).thunder).toBe(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(async () => (await state()).thunder, { timeout: 10000 }).toBe(1);
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  expect((await state()).contexts).toBe(1);
  await page.getByRole('button', { name: 'Mute desk sound', exact: true }).click();
  await expect.poll(async () => (await state()).states).toEqual(['closed']);
});

test('unmount disposes weather and cancels a still-pending master resume', async ({ page }) => {
  await page.addInitScript(() => {
    const Native = AudioContext;
    const p = { contexts: [] as AudioContext[], rain: 0, release: undefined as (() => void) | undefined };
    Object.assign(window, { unmountWeather: p });
    window.AudioContext = class extends Native {
      constructor() { super(); p.contexts.push(this); }
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
  // Test-only intercepted document: no harness or public event API in the app.
  await page.route('**/weather-lifecycle', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><div id="root"></div><button id="unmount">Unmount</button><script type="module">
    import React from '/node_modules/.vite/deps/react.js';
    import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
    const {createRoot}=ReactDOM;
    import {useDeskVoice} from '/src/desk/desk-voice.ts';
    const root=createRoot(document.getElementById('root'));
    function Harness(){const voice=useDeskVoice();React.useEffect(()=>voice.setStorm(true),[voice.setStorm]);return React.createElement('button',null,'Arm weather');}
    root.render(React.createElement(Harness));document.getElementById('unmount').onclick=()=>root.unmount();
  </script>` }));
  await page.goto('/weather-lifecycle');
  await page.getByRole('button', { name: 'Arm weather' }).click();
  await page.getByRole('button', { name: 'Unmount', exact: true }).click();
  await page.evaluate(() => (window as unknown as { unmountWeather: { release?: () => void } }).unmountWeather.release?.());
  await page.waitForTimeout(1200);
  const p = await page.evaluate(() => { const p = (window as unknown as { unmountWeather: { rain: number; contexts: AudioContext[] } }).unmountWeather; return { rain: p.rain, states: p.contexts.map(c => c.state) }; });
  expect(p).toEqual({ rain: 0, states: ['closed'] });
});

test('procedural rain and delayed thunder render quiet PCM and cleanup is silent', async ({ page }) => {
  await page.goto('/?concept=desk');
  const metrics = await page.evaluate(async () => {
    const path = '/src/desk/desk-storm.ts';
    const { createDeskStorm } = await import(/* @vite-ignore */ path);
    const rate = 24000;
    const render = async (kind: string) => {
      const c = new OfflineAudioContext(1, rate * 10, rate);
      const storm = createDeskStorm(c, c.destination);
      if (kind === 'rain' || kind === 'stop' || kind === 'fade' || kind === 'dispose') storm.start();
      if (kind !== 'rain') storm.lightning();
      if (kind === 'dispose') storm.dispose();
      const paused = ['stop', 'fade', 'cancelled'].includes(kind) ? c.suspend(kind === 'cancelled' ? .3 : 1).then(async () => { storm.stop(kind !== 'fade'); await c.resume(); }) : Promise.resolve();
      const pcm = (await c.startRendering()).getChannelData(0); await paused; storm.dispose();
      let peak = 0, early = 0, late = 0, seam = 0;
      for (let i = 0; i < pcm.length; i++) { const v = Math.abs(pcm[i]); peak = Math.max(peak, v); if (i < rate * .8) early = Math.max(early, v); if (i > rate * 1.3) late = Math.max(late, v); if (i > rate * 7.99 && i < rate * 8.01) seam = Math.max(seam, Math.abs(pcm[i] - pcm[i-1])); }
      return { peak, early, late, seam };
    };
    return { rain: await render('rain'), thunder: await render('thunder'), stopped: await render('stop'), faded: await render('fade'), cancelled: await render('cancelled'), disposed: await render('dispose') };
  });
  console.log('storm PCM', JSON.stringify(metrics));
  for (const m of [metrics.rain, metrics.thunder]) { expect(m.peak).toBeGreaterThan(.001); expect(m.peak).toBeLessThan(.035); }
  expect(metrics.thunder.early).toBe(0);
  expect(metrics.rain.seam).toBeLessThan(.01);
  expect(metrics.stopped.peak).toBeGreaterThan(.001);
  expect(metrics.stopped.late).toBe(0);
  expect(metrics.faded.peak).toBeGreaterThan(.001);
  expect(metrics.faded.late).toBe(0);
  expect(metrics.cancelled.peak).toBe(0);
  expect(metrics.disposed.peak).toBe(0);
});
