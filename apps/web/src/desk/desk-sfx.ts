/** Original procedural desk foley: no samples, network assets or familiar tunes. */
export type DeskSound = 'lamp' | 'coffee' | 'duck' | 'rocket' | 'plant' | 'floppy' | 'controller' | 'cassette' | 'books' | 'poster' | 'physics' | 'window' | 'keyboard' | 'cassette-stop' | 'attention' | 'tap' | 'answer' | 'monitor' | 'browser' | 'dial' | 'install' | 'reset' | 'select';

type Source = OscillatorNode | AudioBufferSourceNode;
type Voice = { gain: GainNode; sources: Set<Source>; nodes: AudioNode[]; stopped: boolean };
const MAX_EFFECTS = 4;

/** Also accepts OfflineAudioContext so the actual synthesis can be PCM-tested. */
export function createDeskSynth(context: BaseAudioContext, destination: AudioNode) {
  const effects: Voice[] = [];
  let music: Voice | undefined;
  let speech: Voice | undefined;
  const master = context.createGain();
  master.gain.value = .55;
  // A ceiling for pathological overlapping gestures, not a loudness booster.
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -22; limiter.knee.value = 6; limiter.ratio.value = 12;
  limiter.attack.value = .002; limiter.release.value = .08;
  master.connect(limiter).connect(destination);
  let disposed = false;

  function stop(voice: Voice | undefined) {
    if (!voice || voice.stopped) return;
    voice.stopped = true;
    voice.gain.gain.cancelScheduledValues(context.currentTime);
    voice.gain.gain.setValueAtTime(0, context.currentTime);
    for (const source of voice.sources) { try { source.stop(); } catch { /* already ended */ } source.disconnect(); }
    voice.sources.clear();
    for (const node of voice.nodes) node.disconnect();
    voice.gain.disconnect();
    const index = effects.indexOf(voice); if (index >= 0) effects.splice(index, 1);
  }
  function voice(): Voice {
    const gain = context.createGain(); gain.gain.value = 1; gain.connect(master);
    return { gain, sources: new Set(), nodes: [], stopped: false };
  }
  function source(v: Voice, node: Source, at: number, duration: number) {
    v.sources.add(node);
    node.onended = () => {
      node.disconnect(); v.sources.delete(node);
      if (v.sources.size === 0) stop(v);
    };
    node.start(at); node.stop(at + duration + .008);
  }
  function envelope(v: Voice, at: number, duration: number, volume: number) {
    const gain = context.createGain(); v.nodes.push(gain);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(volume, at + Math.min(.008, duration / 4));
    gain.gain.exponentialRampToValueAtTime(.00001, at + duration);
    gain.connect(v.gain); return gain;
  }
  function tone(v: Voice, hz: number, delay: number, duration: number, volume = .045, type: OscillatorType = 'triangle', end = hz) {
    const at = context.currentTime + delay;
    const node = context.createOscillator(); node.type = type;
    node.frequency.setValueAtTime(hz, at); node.frequency.exponentialRampToValueAtTime(Math.max(20, end), at + duration);
    node.connect(envelope(v, at, duration, volume)); source(v, node, at, duration);
  }
  function noise(v: Voice, delay: number, duration: number, cutoff: number, volume: number, end = cutoff, type: BiquadFilterType = 'lowpass') {
    const at = context.currentTime + delay;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const data = buffer.getChannelData(0);
    // Deterministic procedural noise: repeatable renders, never a stored sample.
    let seed = 731;
    for (let i = 0; i < data.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; data[i] = seed / 2147483648; }
    const node = context.createBufferSource(); node.buffer = buffer;
    const filter = context.createBiquadFilter(); filter.type = type; filter.Q.value = .8;
    filter.frequency.setValueAtTime(cutoff, at); filter.frequency.exponentialRampToValueAtTime(end, at + duration);
    v.nodes.push(filter); node.connect(filter).connect(envelope(v, at, duration, volume)); source(v, node, at, duration);
  }
  function play(cue: DeskSound) {
    if (disposed) return;
    if (cue === 'cassette-stop') { stop(music); music = undefined; return; }
    let v: Voice;
    if (cue === 'cassette') { stop(music); v = voice(); music = v; }
    else { while (effects.length >= MAX_EFFECTS) stop(effects[0]); v = voice(); effects.push(v); }
    switch (cue) {
      case 'duck':
        tone(v, 390, 0, .15, .07, 'sawtooth', 180); tone(v, 480, .19, .18, .06, 'sawtooth', 210);
        noise(v, 0, .09, 850, .035); noise(v, .19, .12, 1000, .025); break;
      case 'keyboard':
        noise(v, 0, .055, 2400, .075, 600); tone(v, 130, 0, .07, .035, 'square');
        [330, 440, 554, 660, 880].forEach((hz, i) => tone(v, hz, .09 + i * .085, .13, .032, 'square')); break;
      case 'controller': [294, 392, 588, 784].forEach((hz, i) => tone(v, hz, i * .085, .1, .037, 'square')); break;
      case 'coffee':
        [240, 310, 210, 420].forEach((hz, i) => tone(v, hz, i * .055, .07, .055, 'sine', hz * .65));
        noise(v, .2, .16, 1100, .05, 300, 'bandpass'); break;
      case 'plant': [760, 980, 650].forEach((hz, i) => tone(v, hz, i * .1, .11, .055, 'sine', hz * .55)); break;
      case 'lamp': noise(v, 0, .028, 2100, .085); tone(v, 160, .008, .055, .025, 'triangle', 70); break;
      case 'floppy': noise(v, 0, .05, 1400, .06); [210, 145, 260].forEach((hz, i) => tone(v, hz, .07 + i * .065, .045, .045, 'square')); break;
      case 'books': [0, .075, .15].forEach(delay => noise(v, delay, .13, 1800, .065, 550, 'bandpass')); break;
      case 'rocket': noise(v, 0, .6, 260, .1, 4500); tone(v, 100, .04, .5, .035, 'triangle', 780); break;
      case 'physics': [587, 988, 1319].forEach((hz, i) => tone(v, hz, i * .12, .2, .035, 'sine')); break;
      case 'poster': tone(v, 220, 0, .3, .025, 'sine', 440); tone(v, 1175, .18, .22, .035, 'sine', 1568); break;
      case 'window': tone(v, 490, 0, .13, .045, 'sine', 690); tone(v, 650, .15, .17, .035, 'sine', 580); break;
      case 'attention': tone(v, 659, 0, .17, .05); tone(v, 880, .22, .23, .045); break;
      case 'cassette':
        // A tiny original modal phrase; melody and bass occupy one stoppable channel.
        [392, 523, 494, 330, 440, 587, 523, 392].forEach((hz, i) => tone(v, hz, i * .28, i === 7 ? .4 : .22, .032, 'square'));
        [131, 147, 110, 131].forEach((hz, i) => tone(v, hz, i * .56, .43, .04));
        noise(v, 0, .045, 1100, .035); break;
      case 'answer': case 'install': tone(v, 440, 0, .12); tone(v, 660, .1, .18); break;
      case 'monitor': tone(v, 180, 0, .23, .035, 'sine', 360); tone(v, 720, .19, .09, .025); break;
      case 'browser': tone(v, 523, 0, .09, .035); tone(v, 784, .08, .13, .03); break;
      case 'dial': tone(v, 280, 0, .045, .035, 'square', 340); break;
      case 'reset': tone(v, 590, 0, .16, .04, 'triangle', 220); break;
      case 'select': tone(v, 740, 0, .075, .03); break;
      case 'tap': noise(v, 0, .025, 1500, .05); tone(v, 260, 0, .04, .02); break;
    }
  }
  function blip(index: number) {
    if (disposed) return;
    stop(speech); speech = voice();
    tone(speech, [520, 610, 570, 660][Math.abs(index) % 4], 0, .027, .017, 'square');
  }
  function stopEffects() { for (const v of [...effects]) stop(v); stop(music); music = undefined; stop(speech); speech = undefined; }
  function dispose() { if (disposed) return; stopEffects(); disposed = true; master.disconnect(); limiter.disconnect(); }
  return { play, blip, stopEffects, dispose };
}
