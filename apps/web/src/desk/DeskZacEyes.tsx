import {useEffect,useState} from 'react';
import './DeskZacEyes.css';

/** A finite wake-up gesture; no timers, RAF loop, filters or idle animation. */
export function DeskZacEyes({awake}:{awake:boolean}) {
  const [hidden,setHidden]=useState(()=>document.hidden);
  useEffect(()=>{
    if(!awake) return;
    const sync=()=>setHidden(document.hidden);
    sync();
    document.addEventListener('visibilitychange',sync);
    return()=>document.removeEventListener('visibilitychange',sync);
  },[awake]);
  return <g data-zac-eyes={awake?'awake':'off'} data-hidden={hidden} fill={awake?'#c7ab72':'#697065'}>
    <rect x="32" y={awake?40:46} width="8" height={awake?8:4}/>
    <rect x="52" y={awake?40:46} width="8" height={awake?8:4}/>
  </g>;
}
