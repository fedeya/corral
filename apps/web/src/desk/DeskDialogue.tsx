import { useEffect, useRef, useState } from 'react';
import { Critter } from './shared';
import type { Species } from './shared';
import './DeskDialogue.css';
import { DeskObjectPortrait } from './DeskObjectPortrait';
import type { DeskObjectId } from './DeskPropArt';
export type DeskLine = { id:number; speaker:string; text:string; portrait?:Species; object?:DeskObjectId; objectLit?:boolean; keyboardEvolved?:boolean; zacAwake?:boolean };
export function DeskDialogue({line,onDismiss,onBlip}:{line:DeskLine;onDismiss:()=>void;onBlip:(index:number)=>void}) {
  const dialogue = useRef<HTMLElement>(null);
  const keyboardOrigin = useRef(document.activeElement instanceof HTMLElement && document.activeElement.matches(':focus-visible') ? document.activeElement : null);
  const tookFocus = useRef(false);
  useEffect(() => () => {
    const origin = keyboardOrigin.current;
    if(tookFocus.current && origin?.isConnected && !origin.closest('[inert],[hidden]')) origin.focus({ preventScroll: true });
  }, []);
  const [progress,setProgress]=useState({id:line.id,count:0});
  const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{const query=window.matchMedia('(prefers-reduced-motion: reduce)'); const change=()=>setReduced(query.matches);query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
  const count=reduced ? line.text.length : progress.id===line.id ? progress.count : 0;
  const typing=count<line.text.length;
  const advance=()=>typing ? setProgress({id:line.id,count:line.text.length}) : onDismiss();
  useEffect(()=>{
    const keydown=(event:KeyboardEvent)=>{
      if(event.key !== ' ' || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const target=event.target instanceof Element ? event.target : null;
      // Keep native controls, typing and the runner's jump binding intact.
      if(target?.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),.desk-computer,.desk-header,.desk-dialogue-close')) return;
      event.preventDefault();
      if(!event.repeat) {
        // Space belongs to this dialogue, not to the pointer-clicked prop.
        // Focus the region (not a button) so keyup cannot advance twice.
        dialogue.current?.focus({ preventScroll: true });
        tookFocus.current = true;
        advance();
      }
    };
    window.addEventListener('keydown',keydown);
    return()=>window.removeEventListener('keydown',keydown);
  },[line.id,line.text,typing,onDismiss]);
  useEffect(()=>{
    if(reduced || !typing) return;
    const timer=setTimeout(()=>{const next=count+1;setProgress({id:line.id,count:next});if(next%3===0 && /\S/.test(line.text[next-1])) onBlip(next);},32);
    return()=>clearTimeout(timer);
  },[line.id,line.text,count,reduced,typing,onBlip]);
  return <section ref={dialogue} tabIndex={-1} className="desk-dialogue" aria-label="Desk dialogue">
    <div className="desk-dialogue-portrait">{line.object ? <DeskObjectPortrait object={line.object} lit={line.objectLit} keyboardEvolved={line.keyboardEvolved} zacAwake={line.zacAwake}/> : line.portrait ? <span aria-hidden="true"><Critter species={line.portrait} size={80} animated={typing} /></span> : <span className="desk-dialogue-spark">✦</span>}</div>
    <div className="desk-dialogue-body"><span className="desk-dialogue-speaker">{line.speaker}</span>
      <span className="desk-sr-only desk-dialogue-message" role="status" aria-live="polite" aria-atomic="true">{line.text}</span>
      <button type="button" className="desk-dialogue-text" aria-label={typing ? 'Complete dialogue' : 'Dismiss dialogue'} onClick={advance}>
        <span className="desk-dialogue-typed" data-typing={typing} aria-hidden="true">{line.text.slice(0,count)}{typing && <i className="desk-dialogue-cursor" />}</span><span className="desk-dialogue-continue" aria-hidden="true">{typing ? '···' : '▾'}</span>
      </button>
    </div><button type="button" className="desk-dialogue-close" aria-label="Close dialogue" onClick={onDismiss}>×</button>
  </section>;
}
