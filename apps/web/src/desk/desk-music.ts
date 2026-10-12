/** Original "Night desk" — a slow D-Dorian miniature, not a sampled song.
 * One bounded 24-second PCM score, one looping source; no recurring scheduler or
 * endlessly allocated oscillators. Periodic note tails cross the loop seam.
 */
export const DESK_MUSIC_SECONDS = 24;

export function createDeskMusic(context: BaseAudioContext, destination: AudioNode) {
  let buffer: AudioBuffer | null = null;
  let disposed = false;
  type Voice = { source: AudioBufferSourceNode; gain: GainNode; timer?: ReturnType<typeof setTimeout> };
  let active: Voice | null = null;
  const voices = new Set<Voice>();

  function score() {
    const result = context.createBuffer(1, Math.round(context.sampleRate * DESK_MUSIC_SECONDS), context.sampleRate);
    const pcm = result.getChannelData(0);
    const rate = context.sampleRate;
    // Handmade, spacious melody; 32 beats at 80 BPM. Suspended harmony avoids
    // a dramatic cadence, so the room can remain in this quiet state indefinitely.
    const melody = [[0, 74], [2.5, 81], [5, 76], [7, 79], [10, 71], [13, 76],
      [16, 74], [18.5, 77], [21, 81], [23.5, 79], [26, 76], [29, 69]];
    function note(beat: number, midi: number, duration: number, volume: number, pad = false) {
      const hz = 440 * 2 ** ((midi - 69) / 12);
      const first = Math.round(beat * .75 * rate);
      const count = Math.round(duration * rate);
      for (let i = 0; i < count; i++) {
        const t = i / rate;
        const phase = 2 * Math.PI * hz * t;
        const attack = Math.min(1, t / (pad ? .35 : .018));
        const release = Math.min(1, (duration - t) / .25);
        const decay = Math.exp(-t / (pad ? 2.1 : .85));
        // Soft piano fundamental + a hint of rounded chip harmonics, never a
        // full-amplitude square wave. All partials share a gentle envelope.
        const wave = Math.sin(phase) + (pad ? .06 : .18) * Math.sin(phase * 2) * Math.exp(-t * 2)
          + (pad ? 0 : .035) * Math.sin(phase * 3);
        pcm[(first + i) % pcm.length] += wave * attack * release * decay * volume;
      }
    }
    for (const [beat, midi] of melody) note(beat, midi, 3, .018);
    for (const [beat, root, fifth] of [[0, 50, 57], [8, 48, 55], [16, 53, 60], [24, 55, 62]]) {
      note(beat, root, 7, .008, true); note(beat + .2, fifth, 6.8, .005, true);
    }
    return result;
  }
  function release(voice: Voice) {
    if (voice.timer !== undefined) clearTimeout(voice.timer);
    voice.source.onended = null;
    voice.source.disconnect(); voice.gain.disconnect(); voices.delete(voice);
    if (active === voice) active = null;
  }
  function start() {
    if (disposed || active) return;
    // A restart during a fade retires its old source before allocating another.
    // Thus even rapid stop/start calls retain at most one audio voice.
    if (voices.size) stop(true);
    buffer ??= score();
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer; source.loop = true; source.loopEnd = DESK_MUSIC_SECONDS;
    gain.gain.setValueAtTime(0, context.currentTime);
    // Far below prop foley; fade in rather than announce a soundtrack.
    gain.gain.linearRampToValueAtTime(.32, context.currentTime + 1.4);
    source.connect(gain).connect(destination);
    const voice: Voice = { source, gain }; active = voice; voices.add(voice);
    source.onended = () => release(voice);
    source.start(context.currentTime);
  }
  function stop(immediate = false) {
    // Include already-fading voices, so rapid stop/start/dispose cannot leave
    // a detached tail or timeout behind.
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
    stop(true); buffer = null; disposed = true;
  }
  return { start, stop, dispose };
}
