/** Original "Night desk": one bounded 24-second PCM score and one looping voice.
 * Synthesis runs off the activation task; audio unlocking remains gesture-owned.
 */
import { loadDeskMusicSamples } from './desk-music-loader';
import { DESK_MUSIC_SECONDS } from './desk-music-score';
export { DESK_MUSIC_SECONDS } from './desk-music-score';

export function createDeskMusic(context: BaseAudioContext, destination: AudioNode) {
  let buffer: AudioBuffer | null = null;
  let disposed = false;
  let wanted = false;
  let pending: Promise<void> | null = null;
  const controller = new AbortController();
  type Voice = { source: AudioBufferSourceNode; gain: GainNode; timer?: ReturnType<typeof setTimeout> };
  let active: Voice | null = null;
  const voices = new Set<Voice>();

  function prepare(): Promise<void> {
    if (disposed || buffer) return Promise.resolve();
    if (pending) return pending;
    const request = loadDeskMusicSamples(context.sampleRate, controller.signal).then(pcm => {
      if (disposed) return;
      const result = context.createBuffer(1, pcm.length, context.sampleRate);
      result.copyToChannel(pcm, 0); buffer = result;
    }).finally(() => { if (pending === request) pending = null; });
    pending = request;
    return request;
  }
  function release(voice: Voice) {
    if (voice.timer !== undefined) clearTimeout(voice.timer);
    voice.source.onended = null;
    voice.source.disconnect(); voice.gain.disconnect(); voices.delete(voice);
    if (active === voice) active = null;
  }
  function startVoice() {
    if (disposed || !wanted || active || !buffer) return;
    // Retire a fading source before allocating another, keeping one voice.
    if (voices.size) stop(true);
    wanted = true;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer; source.loop = true; source.loopEnd = DESK_MUSIC_SECONDS;
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(.32, context.currentTime + 1.4);
    source.connect(gain).connect(destination);
    const voice: Voice = { source, gain }; active = voice; voices.add(voice);
    source.onended = () => release(voice);
    source.start(context.currentTime);
  }
  function start() {
    if (disposed || active) return;
    wanted = true;
    if (buffer) startVoice();
    else void prepare().then(startVoice).catch(error => {
      if (!disposed) console.warn('Could not prepare Corral desk music', error);
    });
  }
  function stop(immediate = false) {
    wanted = false;
    // Also invalidate pending synthesis playback, including hidden-page/replay.
    for (const voice of [...voices]) {
      if (!immediate && voice !== active) continue;
      const now = context.currentTime;
      voice.gain.gain.cancelAndHoldAtTime(now);
      voice.gain.gain.linearRampToValueAtTime(0, now + (immediate ? 0 : .12));
      try { voice.source.stop(immediate ? now : now + .12); } catch { /* already stopped */ }
      if (immediate) release(voice);
      else voice.timer = setTimeout(() => release(voice), 180);
    }
    active = null;
  }
  function dispose() {
    if (disposed) return;
    stop(true); buffer = null; disposed = true; controller.abort();
  }
  return { start, stop, dispose, prepare };
}
