import { deskMusicSamples, DESK_MUSIC_SECONDS } from './desk-music-score';

function yieldTask(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 0);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
}

/** A failed/blocked worker falls back to the same DSP in bounded, cancellable tasks. */
export async function loadDeskMusicSamples(rate: number, signal: AbortSignal): Promise<Float32Array<ArrayBuffer>> {
  signal.throwIfAborted();
  try {
    return await new Promise<Float32Array<ArrayBuffer>>((resolve, reject) => {
      const worker = new Worker(new URL('./desk-music.worker.ts', import.meta.url), { type: 'module' });
      let settled = false;
      const finish = (error?: unknown, pcm?: Float32Array<ArrayBuffer>) => {
        if (settled) return;
        settled = true;
        clearTimeout(deadline); signal.removeEventListener('abort', abort); worker.terminate();
        worker.onmessage = worker.onerror = worker.onmessageerror = null;
        if (pcm) resolve(pcm); else reject(error);
      };
      const abort = () => finish(signal.reason);
      const deadline = setTimeout(() => finish(new Error('Music worker timed out')), 15000);
      signal.addEventListener('abort', abort, { once: true });
      worker.onmessage = (event: MessageEvent<unknown>) => {
        const pcm = event.data;
        if (!(pcm instanceof Float32Array) || !(pcm.buffer instanceof ArrayBuffer) || pcm.length !== Math.round(rate * DESK_MUSIC_SECONDS)) {
          finish(new Error('Invalid music PCM')); return;
        }
        finish(undefined, new Float32Array(pcm.buffer));
      };
      worker.onerror = event => { event.preventDefault(); finish(new Error('Music worker failed')); };
      worker.onmessageerror = () => finish(new Error('Music worker transfer failed'));
      try { worker.postMessage(rate); } catch (error) { finish(error); }
    });
  } catch {
    signal.throwIfAborted();
    const score = deskMusicSamples(rate);
    // Yield before even the first slice: this path must not synthesize in a gesture.
    for (;;) {
      await yieldTask(signal); signal.throwIfAborted();
      const step = score.next();
      if (step.done) return step.value;
    }
  }
}
