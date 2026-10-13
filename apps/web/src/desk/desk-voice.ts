import { useCallback, useEffect, useRef, useState } from 'react';
import { createDeskSynth, type DeskSound } from './desk-sfx';
import { createDeskMusic } from './desk-music';
import { createDeskStorm } from './desk-storm';
export type { DeskSound } from './desk-sfx';

/** Armed by default, but nothing is allocated until a trusted activation. */
export function useDeskVoice() {
  const context = useRef<AudioContext | null>(null);
  const synth = useRef<ReturnType<typeof createDeskSynth> | null>(null);
  const music = useRef<ReturnType<typeof createDeskMusic> | null>(null);
  const storm = useRef<ReturnType<typeof createDeskStorm> | null>(null);
  const raining = useRef(false);
  const desired = useRef(true);
  const mounted = useRef(true);
  const generation = useRef(0);
  const armed = useRef(false);
  const pendingResume = useRef<Promise<boolean> | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const startMusic = useCallback(() => {
    if (mounted.current && desired.current && armed.current && !document.hidden && context.current?.state === 'running') {
      music.current?.start();
      if (raining.current) storm.current?.start();
    }
  }, []);
  const setStorm = useCallback((active: boolean) => {
    raining.current = active;
    if (active) startMusic(); else storm.current?.stop();
  }, [startMusic]);
  const lightning = useCallback(() => {
    // Never queue weather behind a pending resume: that bolt has already passed.
    if (mounted.current && desired.current && armed.current && raining.current && !document.hidden && context.current?.state === 'running' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) storm.current?.lightning();
  }, []);
  const stopEffects = useCallback(() => {
    generation.current++;
    synth.current?.stopEffects();
    // Replay resets the score, but must not permanently silence the ambience.
    music.current?.stop(true);
    storm.current?.stop(true);
    startMusic();
  }, [startMusic]);
  const close = useCallback(() => {
    generation.current++;
    synth.current?.dispose(); synth.current = null;
    music.current?.dispose(); music.current = null;
    storm.current?.dispose(); storm.current = null;
    const current = context.current; context.current = null; pendingResume.current = null;
    if (current && current.state !== 'closed') void current.close().catch(() => {});
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; close(); };
  }, [close]);

  const unlock = useCallback((fromGesture = false): Promise<boolean> => {
    if (!mounted.current || !desired.current || !armed.current) return Promise.resolve(false);
    // WebKit may leave an early resume pending until touchend/click. A fresh
    // trusted activation must call resume synchronously, not await that promise.
    if (pendingResume.current && !fromGesture) return pendingResume.current;
    if (context.current?.state === 'running') { setReady(true); setUnavailable(false); startMusic(); return Promise.resolve(true); }
    if (typeof window.AudioContext !== 'function') { setUnavailable(true); return Promise.resolve(false); }
    let current: AudioContext;
    try {
      current = context.current ?? new AudioContext(); context.current = current;
      synth.current ??= createDeskSynth(current, current.destination);
      music.current ??= createDeskMusic(current, current.destination);
      storm.current ??= createDeskStorm(current, current.destination);
    } catch { close(); setReady(false); setUnavailable(true); return Promise.resolve(false); }
    let timeout: ReturnType<typeof setTimeout>;
    // A blocked WebKit resume can stay pending rather than reject. Let the
    // entrance proceed silently after a bounded wait, retaining the context so
    // the next real gesture can still unlock sound.
    const deadline = new Promise<void>(resolve => { timeout = setTimeout(resolve, 1000); });
    const resume = Promise.race([current.resume(), deadline]).then(() => {
      if (!mounted.current || context.current !== current || !desired.current) return false;
      const running = current.state === 'running'; setReady(running); setUnavailable(!running);
      if (running) startMusic();
      return running;
    }).catch(() => {
      if (mounted.current && context.current === current) { close(); setReady(false); setUnavailable(true); }
      return false;
    }).finally(() => { clearTimeout(timeout); if (pendingResume.current === resume) pendingResume.current = null; });
    pendingResume.current = resume;
    return resume;
  }, [close, startMusic]);

  useEffect(() => {
    const gesture = (event: Event) => {
      if (!event.isTrusted || event.target instanceof Element && event.target.closest('.desk-sound')) return;
      if (event instanceof KeyboardEvent && ['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'Escape'].includes(event.key)) return;
      armed.current = true;
      void unlock(true);
    };
    const visibility = () => {
      if (document.hidden) {
        generation.current++;
        synth.current?.stopEffects(); music.current?.stop(true); storm.current?.stop(true);
      } else if (context.current && armed.current && desired.current) void unlock();
    };
    // Capture completion before React's click changes/removes the entry target.
    const gestures = ['pointerdown', 'touchend', 'click', 'keydown'];
    for (const type of gestures) window.addEventListener(type, gesture, true);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      for (const type of gestures) window.removeEventListener(type, gesture, true);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [unlock]);
  const toggle = useCallback(async () => {
    desired.current = !desired.current; setEnabled(desired.current);
    if (!desired.current) { close(); setReady(false); return false; }
    // The explicit enable control is itself a browser activation, not autoplay.
    // Older Safari has Web Audio but no navigator.userActivation. This callback
    // is invoked directly by the explicit enable button's activation handler.
    armed.current = navigator.userActivation?.isActive ?? true;
    return unlock(true);
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
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => { if (motion.matches) { storm.current?.stop(true); startMusic(); } };
    motion.addEventListener('change', change);
    return () => motion.removeEventListener('change', change);
  }, [startMusic]);
  return { enabled, ready, unavailable, toggle, blip, play, stopEffects, setStorm, lightning };
}
