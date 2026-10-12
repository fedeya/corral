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
  const voice = useDeskVoice();
  const [line, setLine] = useState<DeskLine | null>(null);
  const openingPending=useRef(false);
  const lineCounter = useRef(0);
  const say = (text:string, speaker='DESK NOTES') => setLine({ id:++lineCounter.current, speaker, text });
  const [view, setView] = useState<View>('entry');
  const [app, setApp] = useState<'terminal' | 'browser'>('terminal');
  const [browserPage, setBrowserPage] = useState<DeskBrowserPage>('preview');
  const [theme, setTheme] = useState<ThemeId>('farm');
  const [effects, setEffects] = useState({ lamp: true, rocket: false, plant: false, coffee: false, window:false, keyboard:false });
  const viewport = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1600, height: 1000 });
  const mobile = size.width <= 760;
  const shown = view !== 'closeup' && view!=='entry';
  useEffect(() => {
    const previous=previousStatuses.current;
    previousStatuses.current=demo.statuses;
    if(previous[0] !== 'done' && demo.statuses[0] === 'done') {setTour(current=>current==='preview'?'attention':current);voice.play('attention');}
  },[demo.statuses,voice.play]);
  useEffect(() => {
    if(app==='browser' && browserPage==='preview' && tour!=='first-help') setPreviewVisited(true);
  },[app,browserPage,tour]);
  useEffect(() => {
    if (openingPending.current && view==='closeup' && (voice.ready || voice.unavailable || !voice.enabled)) {
      openingPending.current=false;
      setLine({id:++lineCounter.current,...openingLine});
    }
  }, [voice.ready,voice.unavailable,voice.enabled,view]);
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

  const fit = Math.min(size.width / DESK_GEOMETRY.width, size.height / DESK_GEOMETRY.height);
  const scale = view === 'device' ? Math.min(size.width * (mobile ? .82 : .58) / 300,size.height*.65/210) : view === 'closeup' ? Math.min(size.width * (mobile ? .78 : .52) / 300, size.height * .53 / 210) : view === 'monitor' && !mobile ? Math.min(size.width * .86 / 846, size.height * .85 / 482) : fit;
  const target = view==='device'?{x:1260,y:889}: view === 'closeup' ? { x: 1260, y: 848 } : view === 'monitor' && !mobile ? { x: 785, y: 365 } : { x: 800, y: 550 };
  const sceneStyle = { transform: `scale(${scale}) translate(${-target.x}px, ${-target.y}px)`, '--desk-world-scale': scale } as CSSProperties;
  const zoomTarget=view==='device'?DESK_GEOMETRY.device:DESK_GEOMETRY.screen;
  const screenLeft=size.width/2+(zoomTarget.x-target.x)*scale;
  const screenTop=size.height/2+(zoomTarget.y-target.y)*scale;
  const screenRight=screenLeft+zoomTarget.width*scale;
  const screenBottom=screenTop+zoomTarget.height*scale;
  const surroundStyle = !mobile || view==='device' ? {clipPath:`polygon(evenodd,0 0,100% 0,100% 100%,0 100%,0 0,${screenLeft}px ${screenTop}px,${screenRight}px ${screenTop}px,${screenRight}px ${screenBottom}px,${screenLeft}px ${screenBottom}px,${screenLeft}px ${screenTop}px)`}:undefined;
  const enter = () => {
    setView('closeup');
    if(voice.ready || voice.unavailable || !voice.enabled) setLine({id:++lineCounter.current,...openingLine});
    else openingPending.current=true;
  };
  const showRoom = () => { openingPending.current=false;demo.reveal(); setView('room'); setLine(null); };
  const focus = (index: number) => { voice.play('tap'); demo.focus(index); setApp('terminal'); setLine(null); if(view!=='device') setView(!shown && !mobile?'room':'monitor'); if(!shown && !mobile) say('There I am, in herdr. Tap the monitor for a closer look.', 'API / CLAUDE CODE'); };
  const nextAgent = () => {voice.play('dial'); demo.urgent(); setApp('terminal'); setLine(null); if(view!=='device') setView(!shown && !mobile?'room':'monitor'); };
  const openApp = (next:'terminal'|'browser') => {voice.play(next==='browser'?'browser':'tap');setApp(next); setLine(null);};
  const zoomMonitor = () => {voice.play('monitor');setView(view==='monitor'||view==='device'?'room':'monitor'); setLine(null);};
  const zoomDevice = () => {voice.play('monitor');setView('device');setLine(null);};
  const answer = () => {
    if(demo.statuses[demo.focused]!=='blocked') return;
    voice.play('answer');demo.answer();
    if(demo.focused===0) {setTour('preview');say('Got it. I’ll handle the rest. Go read something in the browser.', 'API / CLAUDE CODE');}
    else if(demo.focused===1) {setTour('free');say('That’s Corral. Your agents work. You stay in your flow.', 'CORRAL');}
  };
  const openPage = (page: DeskBrowserPage) => { if (!shown) showRoom(); if (mobile || view==='device') { setView('monitor'); setLine(null); } setBrowserPage(page); setApp('browser'); };
  const changeEffect = (effect: DeskEffect) => {
    if (effect === 'window') say(effects.window ? 'Back to the stars. Your curious neighbour has gone home.' : 'Someone is watching the night shift. Seems to be rooting for you.', 'THE NIGHT WINDOW');
    if (effect === 'keyboard') say(effects.keyboard ? 'Back to stock. Your wrists will remember this.' : 'Now you have a real keyboard.', 'KEYBOARD / ADVANTAGE 360');
    setEffects(current => ({ ...current, [effect]: effect === 'rocket' ? true : !current[effect] }));
  };
  const replay = () => {openingPending.current=false; voice.stopEffects(); demo.replay(); setTour('first-help'); setPreviewVisited(false); setView('closeup'); setApp('terminal'); setBrowserPage('preview'); setLine({ id:++lineCounter.current, ...openingLine }); };
  const blocked = demo.statuses.flatMap((status, index) => status === 'blocked' ? [DEMO_AGENTS[index].id] : []);
  const done = demo.statuses.flatMap((status, index) => status === 'done' ? [DEMO_AGENTS[index].id] : []);
  const notice = [...done.map(id => `${id} finished`), ...blocked.map(id => `${id} needs you`)].join(' · ');
  const computer = <DeskComputer app={app} page={browserPage} focused={demo.focused} statuses={demo.statuses} progress={demo.progress} onFocus={focus} onAnswer={answer} onApp={openApp} onPage={setBrowserPage} suggestPreview={tour==='preview' && !previewVisited} />;

  return <div className="desk-page" data-view={view} data-api-status={demo.statuses[0]} data-theme={theme} data-talk={!!line} data-tour={tour}>
    <header className="desk-header"><a className="desk-brand" href="./">CORRAL</a><p>A little life on your desk.</p><nav aria-label="Desk navigation">
      <button type="button" className="desk-sound" aria-label={voice.enabled ? 'Mute desk sound' : 'Enable desk sound'} aria-pressed={voice.enabled} onClick={() => { void voice.toggle().then(enabled => { if(enabled && view!=='entry') setLine(current => current ? { ...current, id:++lineCounter.current } : view==='closeup' ? { id:++lineCounter.current, ...openingLine } : null); }); }}>{voice.unavailable ? 'No audio' : voice.enabled ? 'Sound on' : 'Sound off'}</button>
      <button type="button" className="desk-replay" aria-label="Replay" title="Restart the scene" onClick={replay}>↺</button>
      <details className="desk-menu"><summary aria-label="Desk menu">Menu</summary><div><button type="button" onClick={() => openPage('about')}>About & credits</button><button type="button" onClick={() => openPage('source')}>Source & themes</button></div></details>
      {!shown && <button className="desk-skip" type="button" aria-label="Skip intro" title="Skip intro" onClick={showRoom}>Skip intro</button>}
      <button type="button" className="desk-install" aria-label="Open install guide" onClick={() => openPage('install')}>Install Corral <span aria-hidden="true">↓</span></button>
    </nav></header>
    <main>
      <section className="desk-experience" aria-label="Interactive illustrated developer desk">
        <div className="desk-viewport" ref={viewport}>
          {(view==='monitor' && !mobile || view==='device') && <DeskMonitorSurround cameraKey={`${view}:${scale}:${size.width}:${size.height}`} style={surroundStyle} onExit={zoomMonitor} label={view==='device'?'Back to the desk from the Stream Deck surround':undefined} />}
          <div className="desk-ambient-wall" aria-hidden="true" style={{position:'absolute',inset:0,background:'#29353d'}} />
          <div className="desk-scene" style={sceneStyle} inert={view==='entry'}>
            <DeskArt lit={effects.lamp} rocketLaunched={effects.rocket} plantBloom={effects.plant} steam={effects.coffee} visitorVisible={effects.window} keyboardEvolved={effects.keyboard} />
            {!mobile && view==='room' && <DeskMonitorFrame scale={scale} disabled={!shown} zoomed={false} suggested={tour==='first-help' && shown} onToggle={zoomMonitor} />}
            {!mobile && <div className="desk-screen-aperture" inert={!shown || view==='device'}>{shown && computer}</div>}
            <DeskDevice statuses={demo.statuses} focused={demo.focused} theme={theme} closeup={!shown} interactive={view!=='monitor' && (!mobile || !shown || view==='device')} scale={scale} onFocus={focus} onUrgent={nextAgent} onTheme={() => setTheme(current => current === 'farm' ? 'kingdom' : 'farm')} onZoom={!mobile && view==='room'?zoomDevice:undefined} />
            {mobile && view==='room' && <button className="desk-mobile-device-hit" type="button" onClick={zoomDevice} style={{ width: Math.max(300, 44 / scale), height: Math.max(210,44 / scale) }} aria-label="Zoom in on the Stream Deck" />}
            {!mobile && <DeskObjects scale={scale} onOpenPage={openPage} onEffect={changeEffect} onMessage={say} onInteract={voice.play} soundEnabled={voice.enabled && !voice.unavailable} disabled={!shown || view === 'monitor' || view==='device'} />}
          </div>
          <h1 className="desk-sr-only">Corral — a pixel-art home for coding agents on Stream Deck +</h1>
          {view==='entry' && <section className="desk-entry" aria-label="Enter the desk"><div><span className="desk-entry-eyebrow">YOUR AGENTS HAVE A LITTLE HOME HERE</span><h2>A little life<br />on your desk.</h2><button type="button" aria-label="Step inside" onClick={enter}>Step inside <span aria-hidden="true">→</span></button><p>Leave the terminals to them. Make yourself at home.</p></div></section>}
        </div>
        {shown && <p className="desk-room-notice desk-sr-only" role="status" aria-live="polite">{notice}</p>}
        {shown && (mobile || view==='monitor' || view==='device') && <div className="desk-camera-controls"><button type="button" onClick={zoomMonitor}>{view === 'monitor' || view==='device' ? 'Back to the desk ↙' : 'Focus monitor ↗'}</button></div>}
        {line && <DeskDialogue line={line} onDismiss={() => setLine(null)} onBlip={voice.blip} />}
      </section>
      {mobile && shown && <details className="desk-mobile-explore" hidden={view === 'monitor'||view==='device'}><summary>Things on the desk</summary><DeskObjects layout="list" scale={1} onOpenPage={openPage} onEffect={changeEffect} onMessage={say} onInteract={voice.play} soundEnabled={voice.enabled && !voice.unavailable} disabled={view === 'monitor'||view==='device'} /></details>}
      {mobile && view === 'monitor' && <section className="desk-mobile-workspace" aria-label="Readable mobile monitor"><label className="desk-mobile-select">Agent<select aria-label="Focused agent" value={demo.focused} onChange={event => focus(Number(event.target.value))}>{DEMO_AGENTS.map((agent,index) => <option key={agent.id} value={index}>{agent.id} / {demo.statuses[index]}</option>)}</select></label>{computer}</section>}
    </main>
  </div>;
}
