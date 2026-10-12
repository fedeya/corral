import { useEffect, useRef, useState } from 'react';
import type { DeskSound } from './desk-sfx';
import { jumpRun, newRun, RUNNER_WORLD, stepRun } from './arcade-engine';
import './DeskArcade.css';

type Props = { active: boolean; onExit: () => void; onSound?: (cue: DeskSound) => void };
type Phase = 'ready' | 'running' | 'paused' | 'over';

export function DeskArcade({ active, onExit, onSound }: Props) {
  const [run, setRun] = useState(newRun);
  const [phase, setPhase] = useState<Phase>('ready');
  const [best, setBest] = useState(0);
  const [visible, setVisible] = useState(() => !document.hidden);
  const game = useRef<HTMLDivElement>(null);
  const [area,setArea] = useState<{width:number;height:number}>({width:RUNNER_WORLD.width,height:RUNNER_WORLD.height});
  const sound = useRef(onSound);
  sound.current = onSound;
  const playable = active && visible;
  const worldScale=Math.min(area.width/RUNNER_WORLD.width,area.height/RUNNER_WORLD.height);
  const terrainWidth=area.width/worldScale;
  const terrainLeft=(RUNNER_WORLD.width-terrainWidth)/2;
  const terrainBottom=RUNNER_WORLD.height/2+area.height/worldScale/2;

  useEffect(()=>{
    const element=game.current;
    if(!element) return;
    const observer=new ResizeObserver(([entry])=>{
      const {width,height}=entry.contentRect;
      if(width>0 && height>0) setArea({width,height});
    });
    observer.observe(element);
    return()=>observer.disconnect();
  },[]);

  useEffect(() => {
    if(active) game.current?.focus({preventScroll:true});
  },[active]);

  useEffect(() => {
    const visibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);
  useEffect(() => {
    if (!playable) setPhase(current => current === 'running' ? 'paused' : current);
  }, [playable]);
  useEffect(() => {
    if (phase !== 'running' || !playable) return;
    let frame = 0;
    let last: number | undefined;
    const tick = (now: number) => {
      if (last !== undefined) {
        const delta = (now - last) / 1000;
        setRun(current => stepRun(current, delta,{left:terrainLeft,right:terrainLeft+terrainWidth}));
      }
      last = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, playable,terrainLeft,terrainWidth]);
  useEffect(() => {
    if (run.over && phase === 'running') {
      setPhase('over');
      setBest(current => Math.max(current, run.score));
      sound.current?.('attention');
    }
  }, [run.over, run.score, phase]);

  function start() {
    if (!playable) return;
    if (phase !== 'paused') setRun(newRun({left:terrainLeft,right:terrainLeft+terrainWidth}));
    setPhase('running');
    sound.current?.('select');
    game.current?.focus({ preventScroll: true });
  }
  function jump() {
    if (phase !== 'running' || !playable) return;
    if (run.height === 0 && run.velocity === 0) sound.current?.('tap');
    setRun(jumpRun);
    game.current?.focus({ preventScroll: true });
  }
  const state: Phase = phase === 'running' && !playable ? 'paused' : phase;
  const status = state === 'ready' ? 'Your agents work. You jump.' : state === 'paused' ? 'Taking a breather.'
    : state === 'over' ? 'Gremlin encountered. Run it back?' : 'Keep the little cursor moving.';

  return <section className="desk-arcade" aria-label="Agent arcade">
    <header className="desk-arcade-header">
      <div><span className="desk-arcade-eyebrow">OFF THE CLOCK / 01</span><h2>AGENT ARCADE</h2></div>
      <button type="button" onClick={onExit} aria-label="Exit arcade">Exit <span aria-hidden="true">↗</span></button>
    </header>

    <div className="desk-arcade-hud">
      <span><i aria-hidden="true" /> CURSOR RUN</span>
      <span>RUN <output aria-label="Runner score">{String(run.score).padStart(4, '0')}</output> <span className="desk-arcade-best">BEST {String(best).padStart(4, '0')}</span></span>
    </div>
    <div ref={game} className="desk-arcade-game" tabIndex={0} role="region" aria-label="Runner game"
      aria-describedby="desk-arcade-instructions" data-state={state}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onExit(); }
        if ([' ', 'ArrowUp', 'k', 'K'].includes(event.key)) {
          event.preventDefault(); event.stopPropagation();
          if (!event.repeat) {
            if(event.key === ' ' && phase !== 'running') start();
            else jump();
          }
        }
      }}>
      <svg viewBox={`0 0 ${RUNNER_WORLD.width} ${RUNNER_WORLD.height}`} aria-hidden="true" className="desk-arcade-world">
        <defs><pattern id="arcade-floor" width="32" height="16" patternUnits="userSpaceOnUse" patternTransform={`translate(${-(run.distance % 32)} 0)`}><path d="M0 8h12m12 8h8" stroke="currentColor" strokeWidth="2" /></pattern></defs>
        <g className="desk-arcade-stars"><path d="M44 44h4m102 32h4m98-42h4m126 20h4m116 38h4m96-52h4" stroke="currentColor" strokeWidth="3" /></g>

        <path d={`M${terrainLeft} 193h${terrainWidth}`} stroke="currentColor" strokeWidth="2" />
        <rect x={terrainLeft} y="201" width={terrainWidth} height={Math.max(0,terrainBottom-201)} fill="url(#arcade-floor)" opacity=".24" />
        <g data-runner data-airborne={run.height > 0 ? 'true' : 'false'} transform={`translate(${RUNNER_WORLD.runnerX} ${RUNNER_WORLD.floor - 24 - run.height})`} className="desk-arcade-runner">
          <path d="M0 0h20v4h4v16h-4v4H0z" fill="currentColor" />
          <path d="m6 7 5 5-5 5m8 0h4" fill="none" stroke="#252923" strokeWidth="3" />
          <path d={Math.floor(run.distance / 14) % 2 ? 'M3 24v4m14-4v2' : 'M3 24v2m14-2v4'} stroke="currentColor" strokeWidth="3" />
        </g>
        {run.obstacles.map(obstacle => <g key={obstacle.id} transform={`translate(${obstacle.x} ${RUNNER_WORLD.floor - obstacle.height})`} className="desk-arcade-gremlin">
          <path d={`M0 ${obstacle.height}V8h4V0h4v6h${obstacle.width - 16}V0h4v8h4v${obstacle.height - 8}z`} fill="currentColor" />
          <path d={`M5 14h4m${obstacle.width - 14} 0h4`} stroke="#252923" strokeWidth="3" />
        </g>)}
      </svg>
      {state !== 'running' && <div className="desk-arcade-overlay"><span>{state === 'ready' ? 'READY, CURSOR ONE?' : state === 'paused' ? 'PAUSED' : 'END OF RUN'}</span><p>{status}</p></div>}
    </div>
    <div className="desk-arcade-controls">
      {state === 'running' ? <button type="button" onClick={() => setPhase('paused')}>Pause run</button>
        : <button type="button" className="desk-arcade-primary" onClick={start} disabled={!playable}>{state === 'ready' ? 'Start run' : state === 'paused' ? 'Resume run' : 'Retry run'}</button>}
      <button type="button" onClick={jump} disabled={state !== 'running'}>Jump <span aria-hidden="true">↑</span></button>
      <p id="desk-arcade-instructions">Space to start · Space / ↑ / K to jump · Esc to exit</p>
    </div>
    <footer className="desk-arcade-footer"><a href="https://github.com/fedeya/agent-arcade" target="_blank" rel="noreferrer" aria-label="agent-arcade on GitHub">Agent Arcade on GitHub ↗</a></footer>
  </section>;
}
