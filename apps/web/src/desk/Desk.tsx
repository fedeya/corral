import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { DeskArt } from './DeskArt';

import { DeskObjects } from './DeskObjects';
import { DeskDevice } from './DeskDevice';
import { DeskComputer } from './DeskComputer';
import { DeskMonitorFrame } from './DeskMonitorFrame';
import { DeskMonitorSurround } from './DeskMonitorSurround';
import { DESK_GEOMETRY } from './desk-contract';
import type { DeskBrowserPage, DeskEffect } from './desk-contract';
import { DEMO_AGENTS, useDeskDemo } from './desk-demo';
import { DeskDialogue } from './DeskDialogue';
import type { DeskLine } from './DeskDialogue';
import { useDeskVoice } from './desk-voice';
import type { ThemeId } from './shared';
import './desk-common.css';
import './Desk.css';
import './DeskEntry.css';

type View = 'entry' | 'closeup' | 'room' | 'monitor' | 'device';
const openingLine = { speaker:'API / CLAUDE CODE', text:'Psst… I’m adding keyboard shortcuts. Need your call on one thing. Tap my little !', portrait:'goat' } as const;

/** One illustrated coordinate world; the camera moves, not the room or its apps. */
export function Desk() {
  const demo = useDeskDemo();
  const [tour,setTour] = useState<'first-help'|'preview'|'attention'|'free'>('first-help');
  const [previewVisited,setPreviewVisited] = useState(false);
  const previousStatuses = useRef(demo.statuses);
  const celebrated = useRef(false);
  const [celebrating,setCelebrating] = useState(false);
  const voice = useDeskVoice();
  const [line, setLine] = useState<DeskLine | null>(null);
  const openingPending=useRef(false);
  const [openingCameraReady, setOpeningCameraReady] = useState(true);
  const [openingRun, setOpeningRun] = useState(0);
  const lineCounter = useRef(0);
  const duckStep = useRef(0);
  const askDuck = () => {
    const lines = ['What had you expected to happen, and where did reality first disagree?', 'What’s the smallest thing you can test?', 'You already know what to try, don’t you?'];
    say(lines[duckStep.current % lines.length], 'RUBBER DUCK', 'duck');
    duckStep.current++;
  };
  const say = (text:string, speaker='DESK NOTES', object?:import('./DeskPropArt').DeskObjectId) => setLine({ id:++lineCounter.current, speaker, text, object, objectLit:effects.lamp, keyboardEvolved:object==='keyboard'?!effects.keyboard:effects.keyboard, zacAwake:object==='zac'?!effects.zac:effects.zac, portrait:!object && (speaker.includes('CLAUDE CODE') || speaker==='CORRAL')?'goat':undefined });
  const [view, setView] = useState<View>('entry');
  const focusOrigin = useRef<{ element: HTMLElement; label: string | null } | null>(null);
  const previousCamera = useRef<View>('entry');
  const previousApp = useRef('terminal');
  const changeView = (next: View) => {
    if (next !== view && next !== 'room') {
      const element = document.activeElement;
      focusOrigin.current = element instanceof HTMLElement && element !== document.body
        ? { element, label: element.getAttribute('aria-label') } : null;
    }
    setView(next);
  };
  const [app, setApp] = useState<'terminal' | 'browser' | 'arcade'>('terminal');
  const [browserPage, setBrowserPage] = useState<DeskBrowserPage>('preview');
  const [theme, setTheme] = useState<ThemeId>('farm');
  const [effects, setEffects] = useState({ lamp: true, rocket: false, plant: false, coffee: false, window:false, keyboard:false, zac:false });
  useEffect(() => { voice.setStorm(!effects.lamp); }, [effects.lamp, voice.setStorm]);
  const [windowGift,setWindowGift] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1600, height: 1000 });
  const mobile = size.width <= 760;
  const shown = view !== 'closeup' && view!=='entry';
  useEffect(() => {
    const previous=previousStatuses.current;
    previousStatuses.current=demo.statuses;
    if(previous[0] !== 'done' && demo.statuses[0] === 'done') {
      setTour(current=>current==='preview'?'attention':current);
      if(!celebrated.current) { celebrated.current=true; setCelebrating(true); voice.play('celebrate'); }
    }
  },[demo.statuses,voice.play]);
  useEffect(() => {
    if(!celebrating) return;
    const timer=setTimeout(()=>setCelebrating(false),1600);
    return ()=>clearTimeout(timer);
  },[celebrating]);
  useEffect(() => {
    if(app==='browser' && browserPage==='preview' && tour!=='first-help') setPreviewVisited(true);
  },[app,browserPage,tour]);
  useEffect(() => {
    if (openingPending.current && openingCameraReady && view==='closeup' && (voice.ready || voice.unavailable || !voice.enabled)) {
      openingPending.current=false;
      setLine({id:++lineCounter.current,...openingLine});
    }
  }, [voice.ready,voice.unavailable,voice.enabled,view,openingCameraReady,openingRun]);
  useEffect(() => {
    if (openingCameraReady || view !== 'closeup') return;
    // Start speech as the camera settles, rather than after the whole move.
    // Derive a bounded lead-in from CSS and retire it on navigation/replay.
    const scene = viewport.current?.querySelector('.desk-scene');
    const duration = scene ? parseFloat(getComputedStyle(scene).transitionDuration) * 1000 : 0;
    const leadIn = Number.isFinite(duration) ? Math.min(duration * .6, 1000) : 900;
    const timer = setTimeout(() => setOpeningCameraReady(true), leadIn);
    return () => clearTimeout(timer);
  }, [openingCameraReady, openingRun, view]);
  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const measure = () => { const rect = element.getBoundingClientRect(); setSize({ width: rect.width, height: rect.height }); };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!effects.rocket) return;
    const timer = setTimeout(() => setEffects(current => ({ ...current, rocket: false })), 2200);
    return () => clearTimeout(timer);
  }, [effects.rocket]);

  useLayoutEffect(() => {
    const cameraChanged = previousCamera.current !== view;
    const appChanged = previousApp.current !== app;
    previousCamera.current = view;
    previousApp.current = app;
    // Status/progress updates never move reading focus. Arcade owns its game focus.
    if (!cameraChanged && !appChanged || view === 'entry') return;
    const root = viewport.current?.closest('.desk-page');
    if (!root) return;
    const eligible = (element: HTMLElement | null): element is HTMLElement => !!element &&
      element.isConnected && !element.closest('[inert],[hidden]') &&
      !element.matches(':disabled') && element.getClientRects().length > 0;
    let target: HTMLElement | null = null;
    if (view === 'room' && cameraChanged) {
      const origin = focusOrigin.current;
      target = origin?.element ?? null;
      // Frame/overview controls remount when leaving zoom; recover their identity.
      if (!eligible(target) && origin?.label) target = Array.from(root.querySelectorAll<HTMLElement>('[aria-label]'))
        .find(element => element.getAttribute('aria-label') === origin.label && eligible(element)) ?? null;
      if (!eligible(target)) target = root.querySelector<HTMLElement>('.desk-camera-controls button,.desk-monitor-frame');
      focusOrigin.current = null;
    } else if ((view === 'device' || view === 'closeup') && cameraChanged) {
      target = root.querySelector<HTMLElement>('.desk-key:not(:disabled)');
    } else if ((view === 'monitor' || view === 'room') && app !== 'arcade') {
      target = root.querySelector<HTMLElement>('.desk-computer');
    }
    if (eligible(target)) target.focus({ preventScroll: true });
  }, [view, app]);

  const mobileRoom = mobile && view==='room';
  const fit = Math.min(size.width / DESK_GEOMETRY.width, size.height / DESK_GEOMETRY.height);
  // Cover every camera target at the widest (room) scale, including transitions.
  // A fixed 17,600 × 19,000 SVG background made a huge composited paint layer.
  const backdropLeft = Math.min(0, 785 - size.width / (2 * fit)) - 80;
  const backdropTop = Math.min(0, 365 - size.height / (2 * fit)) - 80;
  const backdrop = { x: backdropLeft, y: backdropTop,
    width: Math.max(1600, 1260 + size.width / (2 * fit)) + 80 - backdropLeft,
    height: Math.max(1100, 889 + size.height / (2 * fit)) + 80 - backdropTop };
  const scale = view === 'device' ? Math.min(size.width * (mobile ? .9 : .58) / 300,size.height*.65/210) : view === 'closeup' ? Math.min(size.width * (mobile ? .78 : .52) / 300, size.height * .53 / 210) : view === 'monitor' ? Math.min(size.width * (mobile ? .94 : .86) / 846, size.height * .85 / 482) : fit;
  const target = view==='device'?{x:1260,y:889}: view === 'closeup' ? { x: 1260, y: 848 } : view === 'monitor' ? { x: 785, y: 365 } : { x: 800, y: mobileRoom ? 720 : 550 };
  const sceneStyle = { transform: `scale(${scale}) translate(${-target.x}px, ${-target.y}px)`, '--desk-world-scale': scale } as CSSProperties;
  const zoomTarget=view==='device'?DESK_GEOMETRY.device:DESK_GEOMETRY.screen;
  const screenLeft=size.width/2+(zoomTarget.x-target.x)*scale;
  const screenTop=size.height/2+(zoomTarget.y-target.y)*scale;
  const screenRight=screenLeft+zoomTarget.width*scale;
  const screenBottom=screenTop+zoomTarget.height*scale;
  const surroundStyle = !mobile || view==='device' ? {clipPath:`polygon(evenodd,0 0,100% 0,100% 100%,0 100%,0 0,${screenLeft}px ${screenTop}px,${screenRight}px ${screenTop}px,${screenRight}px ${screenBottom}px,${screenLeft}px ${screenBottom}px,${screenLeft}px ${screenTop}px)`}:undefined;
  const enter = () => {
    openingPending.current=true;
    setLine(null);
    setOpeningCameraReady(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    setOpeningRun(current => current + 1);
    changeView('closeup');
  };
  const showRoom = () => { openingPending.current=false;setOpeningCameraReady(true);demo.reveal(); setView('room'); setLine(null); };
  useLayoutEffect(() => {
    // Bubble after local controls (including the arcade), never capture their Escape.
    const keydown = (event: KeyboardEvent) => {
      if(event.key !== 'Escape' || event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing) return;
      // Reserve Escape while native select popups own focus.
      const target = event.target instanceof Element ? event.target : null;
      if(target?.closest('select')) return;
      const menu = viewport.current?.closest('.desk-page')?.querySelector<HTMLDetailsElement>('.desk-menu[open]');
      if(menu) {
        event.preventDefault();
        menu.open=false;
        menu.querySelector('summary')?.focus();
        return;
      }
      if(line) { event.preventDefault(); setLine(null); return; }
      if(view==='monitor' || view==='device' || view==='closeup') {
        event.preventDefault();
        openingPending.current=false;
        setOpeningCameraReady(true);
        demo.reveal();
        setView('room');
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [line, view, demo.reveal]);
  const focus = (index: number) => { voice.play('tap'); demo.focus(index); setApp('terminal'); setLine(null); if(mobile || view!=='device') changeView(!shown && !mobile?'room':'monitor'); if(!shown && !mobile) say('There I am, in herdr. Tap the monitor for a closer look.', 'API / CLAUDE CODE'); };
  const focusRoom = (index: number) => { demo.focus(index); setApp('terminal'); setLine(null); changeView('room'); };
  const nextAgent = () => {voice.play('dial'); demo.urgent(); setApp('terminal'); setLine(null); if(mobile || view!=='device') changeView(!shown && !mobile?'room':'monitor'); };
  const openApp = (next:'terminal'|'browser'|'arcade') => {voice.play(next==='browser'?'browser':'tap');if(next==='terminal') demo.focus(demo.focused);setApp(next); setLine(null);};
  const openArcade = () => { setApp('arcade'); changeView('monitor'); setLine(null); };
  const zoomMonitor = () => {voice.play('monitor');changeView(view==='monitor'||view==='device'?'room':'monitor'); setLine(null);};
  const zoomDevice = () => {voice.play('monitor');changeView('device');setLine(null);};
  const answer = () => {
    if(demo.statuses[demo.focused]!=='blocked') return;
    voice.play('answer');demo.answer();
    if(demo.focused===0) {setTour('preview');say('Got it. I’ll handle the rest. Go read something in the browser.', 'API / CLAUDE CODE');}
    else if(demo.focused===1) {setTour('free');say('That’s Corral. Your agents work. You stay in your flow.', 'CORRAL');}
  };
  const openPage = (page: DeskBrowserPage) => { if (!shown) showRoom(); if (mobile || view==='device') { changeView('monitor'); setLine(null); } setBrowserPage(page); setApp('browser'); };
  const changeEffect = (effect: DeskEffect) => {
    if (effect === 'zac') say('Not ready to host yet.', 'ZAC / PROTOTYPE', 'zac');
    if (effect === 'lamp') say(effects.lamp ? 'Lights out. The screens keep watch while the rain passes.' : 'Lights on. A little warmth for the next idea.', 'DESK NOTES', 'lamp');
    if (effect === 'window' && !effects.lamp) {
      say(effects.window ? 'The silhouette slips back into the rain. Just you, the screen, and the night shift.' : 'A quiet silhouette waits beyond the glass. Probably another night-shift neighbour sheltering from the rain.', 'THE NIGHT WINDOW', 'window');
    }
    if (effect === 'window' && effects.lamp) {
      if(effects.window) { setWindowGift(true); say('Back to the stars. Your neighbour left a little star on the glass. For the next night shift.', 'THE NIGHT WINDOW', 'window'); }
      else say(windowGift ? 'You’re back. Your neighbour waves at the star. Another late night. At least you’re not the only one awake.' : 'Another late night. At least you’re not the only one awake.', 'THE NIGHT WINDOW', 'window');
    }
    if (effect === 'keyboard') say(effects.keyboard ? 'Back to stock. Your wrists will remember this.' : 'Now you have a real keyboard.', 'KEYBOARD / ADVANTAGE 360', 'keyboard');
    setEffects(current => ({ ...current, [effect]: effect === 'rocket' ? true : !current[effect] }));
  };
  const replay = () => {openingPending.current=false; celebrated.current=false; setCelebrating(false); voice.stopEffects(); setEffects(current => ({...current, zac:false})); demo.replay(); setTour('first-help'); setPreviewVisited(false); setApp('terminal'); setBrowserPage('preview'); enter(); };
  const blocked = demo.statuses.flatMap((status, index) => status === 'blocked' ? [DEMO_AGENTS[index].id] : []);
  const done = demo.statuses.flatMap((status, index) => status === 'done' ? [DEMO_AGENTS[index].id] : []);
  const notice = [...done.map(id => `${id} finished`), ...blocked.map(id => `${id} needs you`)].join(' · ');
  const computer = <DeskComputer completed={demo.completed} app={app} arcadeActive={view==='monitor' || !mobile && view==='room'} onSound={voice.play} page={browserPage} focused={demo.focused} statuses={demo.statuses} progress={demo.progress} onFocus={focus} onAnswer={answer} onApp={openApp} onPage={setBrowserPage} suggestPreview={tour==='preview' && !previewVisited} />;


  return <div className="desk-page" data-view={view} data-lamp={effects.lamp ? 'on' : 'off'} data-api-status={demo.statuses[0]} data-theme={theme} data-talk={!!line} data-entering={!openingCameraReady && view==='closeup'} data-tour={tour}>
    <header className="desk-header"><a className="desk-brand" href="./">CORRAL</a><p>A little life on your desk.</p><nav aria-label="Desk navigation">
      <button type="button" className="desk-sound" aria-label={voice.enabled ? 'Mute desk sound' : 'Enable desk sound'} aria-pressed={voice.enabled} onClick={() => { void voice.toggle().then(enabled => { if(enabled && view!=='entry' && !openingPending.current) setLine(current => current ? { ...current, id:++lineCounter.current } : view==='closeup' ? { id:++lineCounter.current, ...openingLine } : null); }); }}>{voice.unavailable ? 'No audio' : voice.enabled ? 'Sound on' : 'Sound off'}</button>
      <button type="button" className="desk-replay" aria-label="Replay" title="Restart the scene" onClick={replay}>↺</button>
      <details className="desk-menu"><summary aria-label="Desk menu">Menu</summary><div><button type="button" onClick={() => openPage('about')}>About & credits</button><button type="button" onClick={() => openPage('source')}>Source & themes</button><a href="https://fedeminaya.com" target="_blank" rel="noreferrer">Made by Fefe ↗</a></div></details>
      {!shown && <button className="desk-skip" type="button" aria-label="Skip intro" title="Skip intro" onClick={showRoom}>Skip intro</button>}
      <button type="button" className="desk-install" aria-label="Open install guide" onClick={() => openPage('install')}>Install Corral <span aria-hidden="true">↓</span></button>
    </nav></header>
    <main>
      <section className="desk-experience" aria-label="Interactive illustrated developer desk">
        <div className="desk-viewport" ref={viewport}>
          {(view==='monitor' && !mobile || view==='device') && <DeskMonitorSurround cameraKey={`${view}:${scale}:${size.width}:${size.height}`} style={surroundStyle} onExit={zoomMonitor} label={view==='device'?'Back to the desk from the Stream Deck surround':undefined} />}
          <div className="desk-ambient-wall" aria-hidden="true" style={{position:'absolute',inset:0,background:'#29353d'}} />
          <div className="desk-world"><div className="desk-scene" style={sceneStyle} inert={view==='entry'}>
            <DeskArt mobile={mobile} onLightning={voice.lightning} backdrop={backdrop} lit={effects.lamp} rocketLaunched={effects.rocket} plantBloom={effects.plant} steam={effects.coffee} visitorVisible={effects.window} windowGift={windowGift} keyboardEvolved={effects.keyboard} zacAwake={effects.zac} />
            {view==='room' && !mobile && <DeskMonitorFrame scale={scale} disabled={!shown} zoomed={false} suggested={tour==='first-help' && shown} onToggle={zoomMonitor} />}
            {(!mobile || view==='room') && <div className="desk-screen-aperture" inert={mobile || !shown || view==='device'}>{shown && computer}</div>}
            {mobileRoom && <button className="desk-mobile-monitor-hit" type="button" aria-label="Focus illustrated monitor" onClick={zoomMonitor} style={{left:DESK_GEOMETRY.screen.x,top:DESK_GEOMETRY.screen.y,width:DESK_GEOMETRY.screen.width,height:DESK_GEOMETRY.screen.height}} />}
            <DeskDevice active={view==='room' || view==='device' || view==='closeup'} celebrating={celebrating} statuses={demo.statuses} focused={demo.focused} theme={theme} closeup={!shown} interactive={view!=='monitor' && !mobileRoom} scale={scale} onFocus={focus} onFocusRoom={!mobile && view==='device'?focusRoom:undefined} onUrgent={nextAgent} onTheme={() => setTheme(current => current === 'farm' ? 'kingdom' : 'farm')} onZoom={!mobile && view==='room'?zoomDevice:undefined} />
            {mobileRoom && <button className="desk-mobile-device-hit" type="button" aria-label="Zoom in on the Stream Deck" onClick={zoomDevice} style={{left:DESK_GEOMETRY.device.x,top:DESK_GEOMETRY.device.y,width:DESK_GEOMETRY.device.width,height:Math.max(DESK_GEOMETRY.device.height,44/scale)}} />}
            <DeskObjects mobile={mobileRoom} scale={scale} onOpenPage={openPage} onEffect={changeEffect} onMessage={say} onInteract={voice.play} onDuck={askDuck} onArcade={openArcade} soundEnabled={voice.enabled && !voice.unavailable} disabled={!shown || view === 'monitor' || view==='device'} />
          </div></div>
          <h1 className="desk-sr-only">Corral — a pixel-art home for coding agents on Stream Deck +</h1>
          {view==='entry' && <section className="desk-entry" aria-label="Enter the desk"><div><span className="desk-entry-eyebrow">YOUR AGENTS HAVE A LITTLE HOME HERE</span><h2>A little life<br />on your desk.</h2><button type="button" aria-label="Step inside" onClick={enter}>Step inside <span aria-hidden="true">→</span></button><p>Your coding agents, on Stream Deck +.<br />See who needs you. Tap to jump in.</p></div></section>}
        </div>
        {shown && <p className="desk-room-notice desk-sr-only" role="status" aria-live="polite">{notice}</p>}
        {shown && (mobile || view==='monitor' || view==='device') && <div className="desk-camera-controls"><button type="button" onClick={zoomMonitor}>{view === 'monitor' || view==='device' ? 'Back to the desk ↙' : 'Focus monitor ↗'}</button></div>}
        <span className="desk-sr-only desk-dialogue-message" role="status" aria-atomic="true">{line?.text ?? ''}</span>
        {line && <DeskDialogue line={line} onDismiss={() => setLine(null)} onBlip={voice.blip} />}
      </section>
      {mobile && view === 'monitor' && <section className="desk-mobile-workspace" aria-label="Readable mobile monitor"><label className="desk-mobile-select">Agent<select aria-label="Focused agent" value={demo.focused} onChange={event => focus(Number(event.target.value))}>{DEMO_AGENTS.map((agent,index) => <option key={agent.id} value={index}>{agent.id} / {demo.statuses[index]}</option>)}</select></label>{computer}</section>}
    </main>
  </div>;
}
