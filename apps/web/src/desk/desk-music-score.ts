/** Original Night desk score. Shared verbatim DSP by worker and cooperative fallback. */
export const DESK_MUSIC_SECONDS = 24;
export function* deskMusicSamples(rate: number): Generator<void, Float32Array<ArrayBuffer>> {
  const pcm = new Float32Array(Math.round(rate * DESK_MUSIC_SECONDS));
  const melody = [[0, 74], [2.5, 81], [5, 76], [7, 79], [10, 71], [13, 76],
    [16, 74], [18.5, 77], [21, 81], [23.5, 79], [26, 76], [29, 69]];
  function* note(beat: number, midi: number, duration: number, volume: number, pad = false) {
    const hz = 440 * 2 ** ((midi - 69) / 12);
    const first = Math.round(beat * .75 * rate);
    const count = Math.round(duration * rate);
    for (let i = 0; i < count; i++) {
      // No PCM work in the caller's activation task; fallback slices stay small.
      if (i % 8192 === 0) yield;
      const t = i / rate;
      const phase = 2 * Math.PI * hz * t;
      const attack = Math.min(1, t / (pad ? .35 : .018));
      const release = Math.min(1, (duration - t) / .25);
      const decay = Math.exp(-t / (pad ? 2.1 : .85));
      const wave = Math.sin(phase) + (pad ? .06 : .18) * Math.sin(phase * 2) * Math.exp(-t * 2)
        + (pad ? 0 : .035) * Math.sin(phase * 3);
      pcm[(first + i) % pcm.length] += wave * attack * release * decay * volume;
    }
  }
  for (const [beat, midi] of melody) yield* note(beat, midi, 3, .018);
  for (const [beat, root, fifth] of [[0, 50, 57], [8, 48, 55], [16, 53, 60], [24, 55, 62]]) {
    yield* note(beat, root, 7, .008, true); yield* note(beat + .2, fifth, 6.8, .005, true);
  }
  return pcm;
}
