import { useCallback, useEffect, useRef, useState } from 'react';
import { createDeskSynth, type DeskSound } from './desk-sfx';
import { createDeskMusic } from './desk-music';
export type { DeskSound } from './desk-sfx';

/** Armed by default, but nothing is allocated until a trusted activation. */
export function useDeskVoice() {
  const context = useRef<AudioContext | null>(null);
  const synth = useRef<ReturnType<typeof createDeskSynth> | null>(null);
  const music = useRef<ReturnType<typeof createDeskMusic> | null>(null);
  const desired = useRef(true);
  const mounted = useRef(true);
  const generation = useRef(0);
  const armed = useRef(false);
  const pendingResume = useRef<Promise<boolean> | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const startMusic = useCallback(() => {
    if (mounted.current && desired.current && armed.current && !document.hidden && context.current?.state === 'running') music.current?.start();
  }, []);
  const stopEffects = useCallback(() => {
    generation.current++;
    synth.current?.stopEffects();
    // Replay resets the score, but must not permanently silence the ambience.
    music.current?.stop(true);
    startMusic();
  }, [startMusic]);
  const close = useCallback(() => {
    generation.current++;
    synth.current?.dispose(); synth.current = null;
    music.current?.dispose(); music.current = null;
    const current = context.current; context.current = null; pendingResume.current = null;
    if (current && current.state !== 'closed') void current.close().catch(() => {});
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; close(); };
  }, [close]);

  const unlock = useCallback((): Promise<boolean> => {
    if (!mounted.current || !desired.current || !armed.current) return Promise.resolve(false);
    if (pendingResume.current) return pendingResume.current;
    if (context.current?.state === 'running') { startMusic(); return Promise.resolve(true); }
    if (typeof window.AudioContext !== 'function') { setUnavailable(true); return Promise.resolve(false); }
    let current: AudioContext;
    try {
      current = context.current ?? new AudioContext(); context.current = current;
      synth.current ??= createDeskSynth(current, current.destination);
      music.current ??= createDeskMusic(current, current.destination);
    } catch { close(); setReady(false); setUnavailable(true); return Promise.resolve(false); }
    const resume = current.resume().then(() => {
      if (!mounted.current || context.current !== current || !desired.current) return false;
      const running = current.state === 'running'; setReady(running); setUnavailable(false);
      if (running) startMusic();
      return running;
    }).catch(() => {
      if (mounted.current && context.current === current) { close(); setReady(false); setUnavailable(true); }
      return false;
    }).finally(() => { if (pendingResume.current === resume) pendingResume.current = null; });
    pendingResume.current = resume;
    return resume;
  }, [close, startMusic]);

  useEffect(() => {
    const gesture = (event: Event) => {
      if (!event.isTrusted || event.target instanceof Element && event.target.closest('.desk-sound')) return;
      if (event instanceof KeyboardEvent && ['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'Escape'].includes(event.key)) return;
      armed.current = true;
      void unlock();
    };
    const visibility = () => {
      if (document.hidden) {
        generation.current++;
        synth.current?.stopEffects(); music.current?.stop(true);
      } else if (context.current && armed.current && desired.current) void unlock();
    };
    window.addEventListener('pointerdown', gesture);
    window.addEventListener('keydown', gesture);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('pointerdown', gesture); window.removeEventListener('keydown', gesture);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [unlock]);
  const toggle = useCallback(async () => {
    desired.current = !desired.current; setEnabled(desired.current);
    if (!desired.current) { close(); setReady(false); return false; }
    // The explicit enable control is itself a browser activation, not autoplay.
    armed.current = navigator.userActivation?.isActive ?? false;
    return unlock();
  }, [close, unlock]);

  const play = useCallback((cue: DeskSound): void => {
    if (cue === 'cassette-stop') {
      // Invalidate a cassette queued behind resume; ambience is independent.
      generation.current++; synth.current?.play(cue); return;
    }
    if (!desired.current || !mounted.current || !armed.current || document.hidden) return;
    const ticket = generation.current;
    const current = context.current;
    if (current?.state === 'running' && !pendingResume.current) { synth.current?.play(cue); return; }
    void unlock().then(ok => {
      if (ok && mounted.current && desired.current && generation.current === ticket && !document.hidden) synth.current?.play(cue);
    });
  }, [unlock]);
  const blip = useCallback((index: number) => {
    if (!desired.current || !mounted.current || document.hidden || context.current?.state !== 'running') return;
    synth.current?.blip(index);
  }, []);
  return { enabled, ready, unavailable, toggle, blip, play, stopEffects };
}
