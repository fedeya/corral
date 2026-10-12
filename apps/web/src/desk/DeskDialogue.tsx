import { useEffect, useState } from 'react';
import { Critter } from './shared';
import type { Species } from './shared';
import './DeskDialogue.css';
export type DeskLine = { id:number; speaker:string; text:string; portrait?:Species };
export function DeskDialogue({line,onDismiss,onBlip}:{line:DeskLine;onDismiss:()=>void;onBlip:(index:number)=>void}) {
  const [progress,setProgress]=useState({id:line.id,count:0});
  const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{const query=window.matchMedia('(prefers-reduced-motion: reduce)'); const change=()=>setReduced(query.matches);query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
  const count=reduced ? line.text.length : progress.id===line.id ? progress.count : 0;
  const typing=count<line.text.length;
  useEffect(()=>{
    if(reduced || !typing) return;
    const timer=setTimeout(()=>{const next=count+1;setProgress({id:line.id,count:next});if(next%3===0 && /\S/.test(line.text[next-1])) onBlip(next);},32);
    return()=>clearTimeout(timer);
  },[line.id,line.text,count,reduced,typing,onBlip]);
  return <section className="desk-dialogue" aria-label="Desk dialogue">
    <div className="desk-dialogue-portrait" aria-hidden="true">{line.portrait ? <Critter species={line.portrait} size={84} animated={typing} /> : <span className="desk-dialogue-spark">✦</span>}</div>
    <div className="desk-dialogue-body"><span className="desk-dialogue-speaker">{line.speaker}</span>
      <span className="desk-sr-only desk-dialogue-message" role="status" aria-live="polite" aria-atomic="true">{line.text}</span>
      <button type="button" className="desk-dialogue-text" aria-label={typing ? 'Complete dialogue' : 'Dismiss dialogue'} onClick={()=>typing ? setProgress({id:line.id,count:line.text.length}) : onDismiss()}>
        <span className="desk-dialogue-typed" data-typing={typing} aria-hidden="true">{line.text.slice(0,count)}{typing && <i className="desk-dialogue-cursor" />}</span><span className="desk-dialogue-continue" aria-hidden="true">{typing ? '···' : '▾'}</span>
      </button>
    </div><button type="button" className="desk-dialogue-close" aria-label="Close dialogue" onClick={onDismiss}>×</button>
  </section>;
}
