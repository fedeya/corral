/** Quiet original procedural weather, owned by the existing desk master.
 * No context, intervals or wall-clock timers: delayed thunder is a cancellable
 * audio source, cued exclusively by the outdoor bolt's CSS animation lifecycle.
 */
export function createDeskStorm(context: BaseAudioContext, destination: AudioNode) {
  type Voice = { source: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode };
  const voices = new Set<Voice>();
  let rain: Voice | null = null;
  let thunder: Voice | null = null;
  let rainBuffer: AudioBuffer | null = null;
  let thunderBuffer: AudioBuffer | null = null;
  let disposed = false;

  function noise(seconds: number, rumble: boolean) {
    const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
    const pcm = buffer.getChannelData(0);
    let seed = rumble ? 9137 : 731, low = 0;
    for (let i = 0; i < pcm.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      const white = seed / 2147483648;
      low = .985 * low + .015 * white;
      const t = i / context.sampleRate;
      // Rain's short seam taper avoids a discontinuity; thunder has a soft
      // rolling attack and a long tail rather than a sudden close-range clap.
      const shape = rumble ? Math.sin(Math.PI * t / seconds) ** 2 * (.7 + .3 * Math.sin(t * 5) ** 2)
        : Math.min(1, t / .025, (seconds - t) / .025);
      pcm[i] = (rumble ? low * 5 : white) * shape;
    }
    return buffer;
  }
  function release(v: Voice) {
    v.source.onended = null;
    v.source.disconnect(); v.gain.disconnect(); v.filter.disconnect(); voices.delete(v);
    if (rain === v) rain = null;
    if (thunder === v) thunder = null;
  }
  function cancel(v: Voice, immediate = true) {
    const now = context.currentTime;
    v.gain.gain.cancelAndHoldAtTime(now);
    v.gain.gain.linearRampToValueAtTime(0, now + (immediate ? 0 : .18));
    try { v.source.stop(now + (immediate ? 0 : .18)); } catch { /* ended */ }
    if (immediate) release(v);
  }
  function voice(buffer: AudioBuffer, loop: boolean, volume: number, at: number) {
    const source = context.createBufferSource(), gain = context.createGain(), filter = context.createBiquadFilter();
    source.buffer = buffer; source.loop = loop;
    filter.type = 'lowpass'; filter.frequency.value = loop ? 2600 : 320; filter.Q.value = .5;
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(volume, at + (loop ? 1.2 : .5));
    source.connect(filter).connect(gain).connect(destination);
    const v = { source, gain, filter }; voices.add(v);
    source.onended = () => release(v);
    source.start(at); return v;
  }
  function start() {
    if (disposed || rain) return;
    // Rapid lamp toggles retire fading voices, bounding weather to two sources.
    for (const v of [...voices]) if (v !== thunder) cancel(v);
    rainBuffer ??= noise(8, false);
    rain = voice(rainBuffer, true, .009, context.currentTime);
  }
  function lightning() {
    if (disposed) return;
    if (thunder) cancel(thunder);
    thunderBuffer ??= noise(4, true);
    // The bolt peaks 285ms into its cycle; this reaches us ~615ms later.
    thunder = voice(thunderBuffer, false, .032, context.currentTime + .9);
  }
  function stop(immediate = false) {
    for (const v of [...voices]) cancel(v, immediate || v !== rain);
    rain = null; thunder = null;
  }
  function dispose() { if (disposed) return; stop(true); disposed = true; rainBuffer = null; thunderBuffer = null; }
  return { start, lightning, stop, dispose };
}
