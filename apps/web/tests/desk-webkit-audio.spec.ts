import { expect, test } from '@playwright/test';

test.use({ browserName: 'webkit', hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

type Probe = { contexts: AudioContext[]; peak: number; resumes: string[]; blocked: boolean; events: { type: string; trusted: boolean }[] };
async function probe(page: import('@playwright/test').Page, mode: 'native' | 'pending-first' | 'pending-all' = 'native') {
  await page.addInitScript(({ mode }) => {
    const Native = window.AudioContext;
    const audio: Probe = { contexts: [], peak: 0, resumes: [], blocked: mode === 'pending-all', events: [] };
    Object.assign(window, { safariAudio: audio });
    let eventType = '';
    for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(type, event => {
      eventType = event.type; audio.events.push({ type: event.type, trusted: event.isTrusted });
    }, true);
    window.AudioContext = class extends Native {
      constructor() {
        super(); audio.contexts.push(this);
        const analyser = this.createAnalyser(); const samples = new Float32Array(analyser.fftSize);
        const original = AudioNode.prototype.connect;
        AudioNode.prototype.connect = function (this: AudioNode, target: AudioNode | AudioParam, output?: number, input?: number) {
          if (target === analyser.context.destination) Reflect.apply(original, this, [analyser]);
          return Reflect.apply(original, this, target instanceof AudioNode ? [target, output ?? 0, input ?? 0] : [target, output ?? 0]);
        } as AudioNode['connect'];
        setInterval(() => { analyser.getFloatTimeDomainData(samples); for (const sample of samples) audio.peak = Math.max(audio.peak, Math.abs(sample)); }, 10);
      }
      override resume() {
        audio.resumes.push(eventType);
        if (audio.blocked || mode === 'pending-first' && audio.resumes.length === 1) return new Promise<void>(() => {});
        return super.resume();
      }
    };
  }, { mode });
}
const audioState = () => {
  const audio = (window as unknown as { safariAudio: Probe }).safariAudio;
  return { states: audio.contexts.map(context => context.state), peak: audio.peak, resumes: audio.resumes, events: audio.events };
};

test('native WebKit touch entry displays typed introduction and generates audible PCM', async ({ page }) => {
  await probe(page);
  await page.goto('/?concept=desk');
  expect((await page.evaluate(audioState)).states).toEqual([]);
  await page.getByRole('button', { name: 'Step inside', exact: true }).tap();
  await expect(page.locator('.desk-dialogue-typed')).toContainText('Psst');
  await expect(page.locator('.desk-dialogue-typed')).toBeVisible();
  await expect.poll(async () => (await page.evaluate(audioState)).peak).toBeGreaterThan(0.001);
  const audio = await page.evaluate(audioState); console.log('native WebKit audio', JSON.stringify(audio));
  expect(audio.states).toEqual(['running']);
  expect(audio.events.some(event => event.type === 'touchend' && event.trusted)).toBe(true);
});

test('touch completion retries a pending early resume inside trusted activation', async ({ page }) => {
  await probe(page, 'pending-first');
  await page.goto('/?concept=desk');
  await page.getByRole('button', { name: 'Step inside', exact: true }).tap();
  await expect(page.locator('.desk-dialogue-typed')).toContainText('Psst');
  await expect.poll(async () => (await page.evaluate(audioState)).peak).toBeGreaterThan(0.001);
  const audio = await page.evaluate(audioState); console.log('retry WebKit audio', JSON.stringify(audio));
  expect(audio.resumes.some(type => type === 'touchend' || type === 'click')).toBe(true);
  expect(audio.states).toEqual(['running']);
});

test('an indefinitely pending audio resume cannot hide the opening text', async ({ page }) => {
  await probe(page, 'pending-all');
  await page.goto('/?concept=desk');
  await page.getByRole('button', { name: 'Step inside', exact: true }).tap();
  await expect(page.locator('.desk-dialogue-typed')).toContainText('Psst', { timeout: 3000 });
  await expect(page.locator('.desk-dialogue-typed')).toBeVisible();
  await page.evaluate(() => { (window as unknown as { safariAudio: Probe }).safariAudio.blocked = false; });
  await page.getByRole('button', { name: 'Complete dialogue', exact: true }).tap();
  await expect.poll(async () => (await page.evaluate(audioState)).states).toEqual(['running']);
  await expect.poll(async () => (await page.evaluate(audioState)).peak).toBeGreaterThan(0.001);
});

test('explicit sound enable works on Safari without the User Activation API', async ({ page }) => {
  await probe(page);
  await page.addInitScript(() => { Object.defineProperty(navigator, 'userActivation', { value: undefined }); });
  await page.goto('/?concept=desk');
  await page.getByRole('button', { name: 'Mute desk sound', exact: true }).tap();
  await page.getByRole('button', { name: 'Step inside', exact: true }).tap();
  await expect(page.locator('.desk-dialogue-typed')).toContainText('Psst');
  await page.getByRole('button', { name: 'Enable desk sound', exact: true }).tap();
  await expect.poll(async () => (await page.evaluate(audioState)).states).toEqual(['running']);
  await expect.poll(async () => (await page.evaluate(audioState)).peak).toBeGreaterThan(0.001);
});

test('synthetic touchend and click never unlock sound', async ({ page }) => {
  await probe(page);
  await page.goto('/?concept=desk');
  await page.evaluate(() => { window.dispatchEvent(new Event('touchend')); window.dispatchEvent(new MouseEvent('click')); });
  expect((await page.evaluate(audioState)).states).toEqual([]);
});
